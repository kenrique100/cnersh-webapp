/**
 * @jest-environment node
 */

import type { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { utapi } from "@/lib/uploadthing";
import { DELETE } from "@/app/api/delete-blob/route";
import { GET as getFile } from "@/app/api/files/[fileId]/route";
import { GET as viewFile } from "@/app/api/files/view/route";

jest.mock("@/lib/auth-utils", () => ({
    verifiedAuthSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
    db: {
        file: {
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

jest.mock("@/lib/uploadthing", () => ({
    utapi: {
        deleteFiles: jest.fn(),
    },
}));

const mockedVerifiedAuthSession = jest.mocked(verifiedAuthSession);
const mockedDb = db as jest.Mocked<typeof db>;
const mockedUtapi = utapi as jest.Mocked<typeof utapi>;

/**
 * Full session shape returned by `verifiedAuthSession()`.
 * The routes read `session.user.id` and `session.user.role`.
 */
const ownerSession = {
    session: {
        id: "session-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "owner-1",
        expiresAt: new Date(Date.now() + 86_400_000),
        token: "token",
        ipAddress: null,
        userAgent: null,
        impersonatedBy: null,
    },
    user: {
        id: "owner-1",
        email: "owner@test.com",
        emailVerified: true,
        name: "Owner",
        image: null,
        role: "user",
        banned: false,
        banReason: null,
        banExpires: null,
        welcomeEmailSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        gender: "male",
        profession: null,
        title: null,
    },
} as Awaited<ReturnType<typeof verifiedAuthSession>>;

describe("file API authorization", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("rejects anonymous file reads before querying the database", async () => {
        mockedVerifiedAuthSession.mockRejectedValueOnce(new Error("Unauthorized"));

        const response = await getFile(
            {} as NextRequest,
            { params: Promise.resolve({ fileId: "file-1" }) },
        );

        expect(response.status).toBe(401);
        expect(mockedDb.file.findUnique).not.toHaveBeenCalled();
    });

    it("does not let an authenticated user read another user's file", async () => {
        mockedVerifiedAuthSession.mockResolvedValueOnce(ownerSession);
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({
            data: Buffer.from("secret").toString("base64"),
            url: null,
            mimeType: "text/plain",
            filename: "secret.txt",
            userId: "owner-2",
        });

        const response = await getFile(
            {} as NextRequest,
            { params: Promise.resolve({ fileId: "file-1" }) },
        );

        expect(response.status).toBe(404);
    });

    it("marks an owner's file response private and non-cacheable", async () => {
        mockedVerifiedAuthSession.mockResolvedValueOnce(ownerSession);
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({
            data: Buffer.from("content").toString("base64"),
            url: null,
            mimeType: "text/plain",
            filename: "notes.txt",
            userId: "owner-1",
        });

        const response = await getFile(
            {} as NextRequest,
            { params: Promise.resolve({ fileId: "file-1" }) },
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toContain("private");
        expect(response.headers.get("Cache-Control")).toContain("no-store");
    });

    it("keeps the global Next.js file-route cache policy private", () => {
        const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

        expect(nextConfig).toContain(
            '{ source: "/api/files/:fileId", headers: [{ key: "Cache-Control", value: "private, no-store" }] }',
        );
        expect(nextConfig).not.toContain(
            '{ source: "/api/files/:fileId", headers: [{ key: "Cache-Control", value: "public',
        );
    });

    it("rejects anonymous storage-key redirects", async () => {
        mockedVerifiedAuthSession.mockRejectedValueOnce(new Error("Unauthorized"));

        const request = {
            nextUrl: new URL("https://app.example/api/files/view?storageKey=secret"),
        } as NextRequest;

        const response = await viewFile(request);

        expect(response.status).toBe(401);
        expect(mockedDb.file.findUnique).not.toHaveBeenCalled();
    });

    it("rejects anonymous deletion before parsing or storage access", async () => {
        mockedVerifiedAuthSession.mockRejectedValueOnce(new Error("Unauthorized"));

        const response = await DELETE(new Request("https://app.example/api/delete-blob", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storageKey: "secret" }),
        }));

        expect(response.status).toBe(401);
        expect(mockedUtapi.deleteFiles).not.toHaveBeenCalled();
    });

    it("deletes storage and the database record only for the owner", async () => {
        mockedVerifiedAuthSession.mockResolvedValueOnce(ownerSession);
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({
            id: "file-1",
            userId: "owner-1",
        });
        mockedUtapi.deleteFiles.mockResolvedValueOnce({ success: true, deletedCount: 1 });
        (mockedDb.file.delete as jest.Mock).mockResolvedValueOnce({});

        const response = await DELETE(new Request("https://app.example/api/delete-blob", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storageKey: "storage-1" }),
        }));

        expect(response.status).toBe(200);
        expect(mockedUtapi.deleteFiles).toHaveBeenCalledWith("storage-1");
        expect(mockedDb.file.delete).toHaveBeenCalledWith({ where: { id: "file-1" } });
    });
});
/**
 * @jest-environment node
 */

import type { NextRequest } from "next/server";
import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { utapi } from "@/lib/uploadthing";
import { DELETE } from "@/app/api/delete-blob/route";
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

    it("rejects anonymous storage-key redirects", async () => {
        mockedVerifiedAuthSession.mockRejectedValueOnce(new Error("Unauthorized"));

        const request = {
            nextUrl: new URL("https://app.example/api/files/view?storageKey=secret"),
        } as NextRequest;

        const response = await viewFile(request);

        expect(response.status).toBe(401);
        expect(mockedDb.file.findUnique).not.toHaveBeenCalled();
    });

    it("rejects anonymous file-id redirects", async () => {
        mockedVerifiedAuthSession.mockRejectedValueOnce(new Error("Unauthorized"));

        const request = {
            nextUrl: new URL("https://app.example/api/files/view?id=file-1"),
        } as NextRequest;

        const response = await viewFile(request);

        expect(response.status).toBe(401);
        expect(mockedDb.file.findUnique).not.toHaveBeenCalled();
    });

    it("returns 400 when neither storageKey nor id is supplied", async () => {
        mockedVerifiedAuthSession.mockResolvedValueOnce(ownerSession);

        const request = {
            nextUrl: new URL("https://app.example/api/files/view"),
        } as NextRequest;

        const response = await viewFile(request);

        expect(response.status).toBe(400);
        expect(mockedDb.file.findUnique).not.toHaveBeenCalled();
    });

    it("does not let an authenticated user read another user's file by id", async () => {
        mockedVerifiedAuthSession.mockResolvedValueOnce(ownerSession);
        (mockedDb.file.findUnique as jest.Mock).mockResolvedValueOnce({
            url: "https://ufs.example/secret",
            userId: "owner-2",
        });

        const request = {
            nextUrl: new URL("https://app.example/api/files/view?id=file-1"),
        } as NextRequest;

        const response = await viewFile(request);

        expect(response.status).toBe(404);
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
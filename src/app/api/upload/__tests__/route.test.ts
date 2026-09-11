/**
 * @jest-environment node
 */

import type { NextRequest } from "next/server";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { utapi } from "@/lib/uploadthing";
import { POST } from "@/app/api/upload/route";

jest.mock("@/lib/auth-utils", () => ({
    authSession: jest.fn(),
}));

jest.mock("@/lib/file-validation", () => ({
    validateMimeType: jest.fn(() => true),
    performBasicMalwareCheck: jest.fn(async () => ({ safe: true })),
}));

jest.mock("@/lib/sanitize-filename", () => ({
    sanitizeFilename: jest.fn((name: string) => name),
}));

jest.mock("@/lib/rate-limit", () => ({
    RATE_LIMITS: { fileUpload: { windowMs: 60_000, maxRequests: 10 } },
    withRateLimit: jest.fn((handler: unknown) => handler),
}));

jest.mock("@/middleware/idempotency", () => ({
    withIdempotency: jest.fn((handler: unknown) => handler),
}));

jest.mock("@/lib/db", () => ({
    db: {
        file: {
            create: jest.fn(),
        },
    },
}));

jest.mock("@/lib/uploadthing", () => ({
    utapi: {
        uploadFiles: jest.fn(),
        deleteFiles: jest.fn(),
    },
}));

const mockedAuthSession = jest.mocked(authSession);
const mockedDb = db as jest.Mocked<typeof db>;
const mockedUtapi = utapi as jest.Mocked<typeof utapi>;

describe("upload compensation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedAuthSession.mockResolvedValue({
            user: { id: "owner-1", role: "user" },
        } as Awaited<ReturnType<typeof authSession>>);
    });

    it("removes the storage object when the database insert fails", async () => {
        mockedUtapi.uploadFiles.mockResolvedValueOnce({
            data: {
                key: "storage-key-1",
                url: "https://files.example/storage-key-1",
                name: "photo.png",
                size: 4,
                type: "image/png",
                customId: null,
                fileHash: "hash",
            },
            error: null,
        } as never);
        (mockedDb.file.create as jest.Mock).mockRejectedValueOnce(new Error("database down"));
        mockedUtapi.deleteFiles.mockResolvedValueOnce({ success: true, deletedCount: 1 });
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

        const form = new FormData();
        form.set("file", new File([new Uint8Array([1, 2, 3, 4])], "photo.png", {
            type: "image/png",
        }));
        const request = new Request("https://app.example/api/upload", {
            method: "POST",
            body: form,
        }) as unknown as NextRequest;

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(mockedUtapi.deleteFiles).toHaveBeenCalledWith("storage-key-1");
        consoleError.mockRestore();
    });
});

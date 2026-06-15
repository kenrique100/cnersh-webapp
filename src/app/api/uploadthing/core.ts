import { createUploadthing, type FileRouter, UploadThingError } from "uploadthing/server";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { validateFile } from "@/lib/file-validation";
import { ALLOWED_DOCUMENT_TYPES, UT_MAX_SIZES, MAX_DOCUMENT_PAGES } from "@/lib/file-utils";
import type { FileType } from "@/generated/prisma";

const f = createUploadthing();

function resolveFileType(mimeType: string): FileType {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "document";
}

const authenticate = async () => {
    const session = await authSession();
    if (!session) throw new UploadThingError("Unauthorized");
    return { userId: session.user.id };
};

const documentMimeConfig = Object.fromEntries(
    ALLOWED_DOCUMENT_TYPES.map(mime => [mime, { maxFileSize: UT_MAX_SIZES.document, maxFileCount: 5 }])
);

const protocolMimeConfig = Object.fromEntries(
    ALLOWED_DOCUMENT_TYPES.map(mime => [mime, { maxFileSize: UT_MAX_SIZES.protocol, maxFileCount: 3 }])
);

async function validateAndCleanup(file: { ufsUrl: string; key: string; name: string; type: string }) {
    const response = await fetch(file.ufsUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Cast the return type so TypeScript understands 'error' can be read safely
    const validation = await validateFile(
        buffer,
        new File([buffer], file.name, { type: file.type }),
        { maxPages: MAX_DOCUMENT_PAGES }
    ) as { valid: boolean; error?: string };

    if (!validation.valid) {
        try {
            const { UTApi } = await import("uploadthing/server");
            await new UTApi().deleteFiles([file.key]);
        } catch (err) {
            console.error("Cleanup failed for orphaned file:", file.key, err);
        }
        // TypeScript is now completely happy with this line
        throw new UploadThingError(validation.error ?? "Document validation failed.");
    }
}

export const ourFileRouter = {
    imageUploader: f({ image: { maxFileSize: UT_MAX_SIZES.image, maxFileCount: 10 } })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            const stored = await db.file.create({
                data: { filename: file.name, mimeType: file.type, size: file.size, url: file.ufsUrl, data: null, type: resolveFileType(file.type), userId: metadata.userId },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return { fileId: stored.id, url: stored.url ?? file.ufsUrl, name: stored.filename, type: stored.mimeType, size: stored.size, category: stored.type, createdAt: stored.createdAt.toISOString() };
        }),

    avatarUploader: f({ image: { maxFileSize: UT_MAX_SIZES.avatar, maxFileCount: 1 } })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            await db.file.deleteMany({ where: { userId: metadata.userId, type: "avatar" } });
            const stored = await db.file.create({
                data: { filename: file.name, mimeType: file.type, size: file.size, url: file.ufsUrl, data: null, type: "avatar", userId: metadata.userId },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return { fileId: stored.id, url: stored.url ?? file.ufsUrl, name: stored.filename, type: stored.mimeType, size: stored.size, category: stored.type, createdAt: stored.createdAt.toISOString() };
        }),

    videoUploader: f({ video: { maxFileSize: UT_MAX_SIZES.video, maxFileCount: 3 } })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            const stored = await db.file.create({
                data: { filename: file.name, mimeType: file.type, size: file.size, url: file.ufsUrl, data: null, type: "video", userId: metadata.userId },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return { fileId: stored.id, url: stored.url ?? file.ufsUrl, name: stored.filename, type: stored.mimeType, size: stored.size, category: stored.type, createdAt: stored.createdAt.toISOString() };
        }),

    audioUploader: f({ audio: { maxFileSize: UT_MAX_SIZES.audio, maxFileCount: 5 } })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            const stored = await db.file.create({
                data: { filename: file.name, mimeType: file.type, size: file.size, url: file.ufsUrl, data: null, type: "audio", userId: metadata.userId },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return { fileId: stored.id, url: stored.url ?? file.ufsUrl, name: stored.filename, type: stored.mimeType, size: stored.size, category: stored.type, createdAt: stored.createdAt.toISOString() };
        }),

    documentUploader: f(documentMimeConfig)
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            await validateAndCleanup(file);
            const stored = await db.file.create({
                data: { filename: file.name, mimeType: file.type, size: file.size, url: file.ufsUrl, data: null, type: "document", userId: metadata.userId },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return { fileId: stored.id, url: stored.url ?? file.ufsUrl, name: stored.filename, type: stored.mimeType, size: stored.size, category: stored.type, createdAt: stored.createdAt.toISOString() };
        }),

    protocolUploader: f(protocolMimeConfig)
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            await validateAndCleanup(file);
            const stored = await db.file.create({
                data: { filename: file.name, mimeType: file.type, size: file.size, url: file.ufsUrl, data: null, type: "protocol", userId: metadata.userId },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return { fileId: stored.id, url: stored.url ?? file.ufsUrl, name: stored.filename, type: stored.mimeType, size: stored.size, category: stored.type, createdAt: stored.createdAt.toISOString() };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
import { createUploadthing, type FileRouter, UploadThingError } from "uploadthing/server";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { validateFile } from "@/lib/file-validation";
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

export const ourFileRouter = {
    imageUploader: f({ image: { maxFileSize: "32MB", maxFileCount: 10 } })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            const stored = await db.file.create({
                data: {
                    filename: file.name,
                    mimeType: file.type,
                    size: file.size,
                    url: file.ufsUrl,
                    data: null,
                    type: resolveFileType(file.type),
                    userId: metadata.userId,
                },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return {
                fileId: stored.id,
                url: stored.url ?? file.ufsUrl,
                name: stored.filename,
                type: stored.mimeType,
                size: stored.size,
                category: stored.type,
                createdAt: stored.createdAt.toISOString(),
            };
        }),

    avatarUploader: f({ image: { maxFileSize: "32MB", maxFileCount: 1 } })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            const stored = await db.file.create({
                data: {
                    filename: file.name,
                    mimeType: file.type,
                    size: file.size,
                    url: file.ufsUrl,
                    data: null,
                    type: "avatar",
                    userId: metadata.userId,
                },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return {
                fileId: stored.id,
                url: stored.url ?? file.ufsUrl,
                name: stored.filename,
                type: stored.mimeType,
                size: stored.size,
                category: stored.type,
                createdAt: stored.createdAt.toISOString(),
            };
        }),

    videoUploader: f({ video: { maxFileSize: "128MB", maxFileCount: 3 } })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            const stored = await db.file.create({
                data: {
                    filename: file.name,
                    mimeType: file.type,
                    size: file.size,
                    url: file.ufsUrl,
                    data: null,
                    type: "video",
                    userId: metadata.userId,
                },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return {
                fileId: stored.id,
                url: stored.url ?? file.ufsUrl,
                name: stored.filename,
                type: stored.mimeType,
                size: stored.size,
                category: stored.type,
                createdAt: stored.createdAt.toISOString(),
            };
        }),

    audioUploader: f({ audio: { maxFileSize: "8MB", maxFileCount: 5 } })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            const stored = await db.file.create({
                data: {
                    filename: file.name,
                    mimeType: file.type,
                    size: file.size,
                    url: file.ufsUrl,
                    data: null,
                    type: "audio",
                    userId: metadata.userId,
                },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return {
                fileId: stored.id,
                url: stored.url ?? file.ufsUrl,
                name: stored.filename,
                type: stored.mimeType,
                size: stored.size,
                category: stored.type,
                createdAt: stored.createdAt.toISOString(),
            };
        }),

    documentUploader: f({
        "application/pdf": { maxFileSize: "64MB", maxFileCount: 5 },
        "application/msword": { maxFileSize: "64MB", maxFileCount: 5 },
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "64MB", maxFileCount: 5 },
        "application/vnd.ms-excel": { maxFileSize: "64MB", maxFileCount: 5 },
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { maxFileSize: "64MB", maxFileCount: 5 },
    })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            const response = await fetch(file.ufsUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            const validation = await validateFile(buffer, new File([buffer], file.name, { type: file.type }), { maxPages: 4 });
            if (!validation.valid) {
                throw new UploadThingError(validation.error ?? "Document page count validation failed");
            }
            const stored = await db.file.create({
                data: {
                    filename: file.name,
                    mimeType: file.type,
                    size: file.size,
                    url: file.ufsUrl,
                    data: null,
                    type: "document",
                    userId: metadata.userId,
                },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return {
                fileId: stored.id,
                url: stored.url ?? file.ufsUrl,
                name: stored.filename,
                type: stored.mimeType,
                size: stored.size,
                category: stored.type,
                createdAt: stored.createdAt.toISOString(),
            };
        }),

    protocolUploader: f({
        "application/pdf": { maxFileSize: "64MB", maxFileCount: 3 },
        "application/msword": { maxFileSize: "64MB", maxFileCount: 3 },
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "64MB", maxFileCount: 3 },
    })
        .middleware(authenticate)
        .onUploadComplete(async ({ metadata, file }) => {
            const response = await fetch(file.ufsUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            const validation = await validateFile(buffer, new File([buffer], file.name, { type: file.type }), { maxPages: 4 });
            if (!validation.valid) {
                throw new UploadThingError(validation.error ?? "Document page count validation failed");
            }
            const stored = await db.file.create({
                data: {
                    filename: file.name,
                    mimeType: file.type,
                    size: file.size,
                    url: file.ufsUrl,
                    data: null,
                    type: "protocol",
                    userId: metadata.userId,
                },
                select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
            });
            return {
                fileId: stored.id,
                url: stored.url ?? file.ufsUrl,
                name: stored.filename,
                type: stored.mimeType,
                size: stored.size,
                category: stored.type,
                createdAt: stored.createdAt.toISOString(),
            };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
import { createUploadthing, type FileRouter, UploadThingError } from "uploadthing/server";
import { authSession } from "@/lib/auth-utils";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const f = createUploadthing();

// ─── FileType resolver (mirrors the old upload route logic) ────────────────
function resolveFileType(
  mimeType: string
): "avatar" | "protocol" | "document" | "image" | "video" | "audio" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

// ─── Shared middleware ─────────────────────────────────────────────────────
const authenticate = async () => {
  const session = await authSession();
  if (!session) throw new UploadThingError("Unauthorized");
  return { userId: session.user.id };
};

// ─── File Router ───────────────────────────────────────────────────────────
export const ourFileRouter = {
  /**
   * General image uploader — used for post images, community topic images,
   * community reply images, and any other image upload in the app.
   * Supports up to 10 images at once, each up to 10 MB.
   */
  imageUploader: f({
    image: { maxFileSize: "10MB", maxFileCount: 10 },
  })
    .middleware(authenticate)
    .onUploadComplete(async ({ metadata, file }) => {
      const fileType = resolveFileType(file.type);
      const stored = await db.file.create({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: file.ufilerl ?? file.url,
          data: null,
          type: fileType as any,
          userId: metadata.userId,
        },
        select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
      });
      return {
        fileId: stored.id,
        url: stored.url ?? file.url,
        name: stored.filename,
        type: stored.mimeType,
        size: stored.size,
        category: stored.type,
        createdAt: stored.createdAt,
      };
    }),

  /**
   * Avatar uploader — single image only, used for user profile pictures.
   */
  avatarUploader: f({
    image: { maxFileSize: "10MB", maxFileCount: 1 },
  })
    .middleware(authenticate)
    .onUploadComplete(async ({ metadata, file }) => {
      const stored = await db.file.create({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: file.ufilerl ?? file.url,
          data: null,
          type: "avatar" as any,
          userId: metadata.userId,
        },
        select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
      });
      return {
        fileId: stored.id,
        url: stored.url ?? file.url,
        name: stored.filename,
        type: stored.mimeType,
        size: stored.size,
        category: stored.type,
        createdAt: stored.createdAt,
      };
    }),

  /**
   * Video uploader — up to 3 videos at once, each up to 50 MB.
   */
  videoUploader: f({
    video: { maxFileSize: "50MB", maxFileCount: 3 },
  })
    .middleware(authenticate)
    .onUploadComplete(async ({ metadata, file }) => {
      const stored = await db.file.create({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: file.ufilerl ?? file.url,
          data: null,
          type: "video" as any,
          userId: metadata.userId,
        },
        select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
      });
      return {
        fileId: stored.id,
        url: stored.url ?? file.url,
        name: stored.filename,
        type: stored.mimeType,
        size: stored.size,
        category: stored.type,
        createdAt: stored.createdAt,
      };
    }),

  /**
   * Audio uploader — up to 5 audio files at once, each up to 8 MB.
   */
  audioUploader: f({
    audio: { maxFileSize: "8MB", maxFileCount: 5 },
  })
    .middleware(authenticate)
    .onUploadComplete(async ({ metadata, file }) => {
      const stored = await db.file.create({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: file.ufilerl ?? file.url,
          data: null,
          type: "audio" as any,
          userId: metadata.userId,
        },
        select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
      });
      return {
        fileId: stored.id,
        url: stored.url ?? file.url,
        name: stored.filename,
        type: stored.mimeType,
        size: stored.size,
        category: stored.type,
        createdAt: stored.createdAt,
      };
    }),

  /**
   * Document uploader — PDFs, Word, Excel. Up to 5 at once, each up to 20 MB.
   */
  documentUploader: f({
    "application/pdf": { maxFileSize: "20MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "20MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "20MB",
      maxFileCount: 5,
    },
    "application/vnd.ms-excel": { maxFileSize: "20MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "20MB",
      maxFileCount: 5,
    },
  })
    .middleware(authenticate)
    .onUploadComplete(async ({ metadata, file }) => {
      const stored = await db.file.create({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: file.ufilerl ?? file.url,
          data: null,
          type: "document" as any,
          userId: metadata.userId,
        },
        select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
      });
      return {
        fileId: stored.id,
        url: stored.url ?? file.url,
        name: stored.filename,
        type: stored.mimeType,
        size: stored.size,
        category: stored.type,
        createdAt: stored.createdAt,
      };
    }),

  /**
   * Protocol / research document uploader — same as document but
   * stored under the "protocol" FileType for audit trail purposes.
   */
  protocolUploader: f({
    "application/pdf": { maxFileSize: "20MB", maxFileCount: 3 },
    "application/msword": { maxFileSize: "20MB", maxFileCount: 3 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "20MB",
      maxFileCount: 3,
    },
  })
    .middleware(authenticate)
    .onUploadComplete(async ({ metadata, file }) => {
      const stored = await db.file.create({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: file.ufilerl ?? file.url,
          data: null,
          type: "protocol" as any,
          userId: metadata.userId,
        },
        select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true, url: true },
      });
      return {
        fileId: stored.id,
        url: stored.url ?? file.url,
        name: stored.filename,
        type: stored.mimeType,
        size: stored.size,
        category: stored.type,
        createdAt: stored.createdAt,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

import { createUploadthing, type FileRouter, UploadThingError } from "uploadthing/server";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

const f = createUploadthing();

// ─── FileType resolver ─────────────────────────────────────────────────────
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
//
// IMPORTANT: UploadThing maxFileSize only accepts power-of-2 values.
// Valid options: "1MB" "2MB" "4MB" "8MB" "16MB" "32MB" "64MB" "128MB" "256MB" "512MB" "1GB" "2GB"
//
// Requested limits rounded UP to the nearest valid power-of-2:
//   images / avatars  25 MB  → "32MB"
//   videos           100 MB  → "128MB"
//   audio              8 MB  → "8MB"
//   docs / protocols  50 MB  → "64MB"

export const ourFileRouter = {
  /**
   * General image uploader — post images, community topic/reply images, etc.
   * Up to 10 images at once, each capped at 32 MB (covers the 25 MB requirement).
   */
  imageUploader: f({
    image: { maxFileSize: "32MB", maxFileCount: 10 },
  })
    .middleware(authenticate)
    .onUploadComplete(async ({ metadata, file }) => {
      const fileType = resolveFileType(file.type);
      const stored = await db.file.create({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: file.url,
          data: null,
          type: fileType as any,
          userId: metadata.userId,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          type: true,
          createdAt: true,
          url: true,
        },
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
   * Avatar uploader — single image for user profile pictures.
   * Capped at 32 MB (covers the 25 MB requirement).
   */
  avatarUploader: f({
    image: { maxFileSize: "32MB", maxFileCount: 1 },
  })
    .middleware(authenticate)
    .onUploadComplete(async ({ metadata, file }) => {
      const stored = await db.file.create({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: file.url,
          data: null,
          type: "avatar" as any,
          userId: metadata.userId,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          type: true,
          createdAt: true,
          url: true,
        },
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
   * Video uploader — up to 3 videos at once.
   * Capped at 128 MB per file (covers the 100 MB requirement).
   */
  videoUploader: f({
    video: { maxFileSize: "128MB", maxFileCount: 3 },
  })
    .middleware(authenticate)
    .onUploadComplete(async ({ metadata, file }) => {
      const stored = await db.file.create({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: file.url,
          data: null,
          type: "video" as any,
          userId: metadata.userId,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          type: true,
          createdAt: true,
          url: true,
        },
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
   * Audio uploader — up to 5 audio files at once, each capped at 8 MB.
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
          url: file.url,
          data: null,
          type: "audio" as any,
          userId: metadata.userId,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          type: true,
          createdAt: true,
          url: true,
        },
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
   * Document uploader — PDFs, Word, Excel.
   * Up to 5 files at once, each capped at 64 MB (covers the 50 MB requirement).
   */
  documentUploader: f({
    "application/pdf": { maxFileSize: "64MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "64MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "64MB",
      maxFileCount: 5,
    },
    "application/vnd.ms-excel": { maxFileSize: "64MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "64MB",
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
          url: file.url,
          data: null,
          type: "document" as any,
          userId: metadata.userId,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          type: true,
          createdAt: true,
          url: true,
        },
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
   * Protocol / research document uploader — stored under "protocol" FileType for audit trail.
   * Up to 3 files at once, each capped at 64 MB (covers the 50 MB requirement).
   */
  protocolUploader: f({
    "application/pdf": { maxFileSize: "64MB", maxFileCount: 3 },
    "application/msword": { maxFileSize: "64MB", maxFileCount: 3 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "64MB",
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
          url: file.url,
          data: null,
          type: "protocol" as any,
          userId: metadata.userId,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          type: true,
          createdAt: true,
          url: true,
        },
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

import { db } from "@/lib/db";
import { utapi } from "@/lib/uploadthing";
import type { FileType } from "@/generated/prisma";

export const MAX_DOCUMENT_PAGES = 4;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

// Updated max sizes (in bytes)
export const MAX_FILE_SIZES = {
  avatar:   8  * 1024 * 1024,   // 8 MB
  image:    15 * 1024 * 1024,   // 15 MB
  video:    50 * 1024 * 1024,   // 50 MB
  audio:    8  * 1024 * 1024,   // 8 MB
  document: 15 * 1024 * 1024,   // 15 MB
  protocol: 50 * 1024 * 1024,   // 50 MB
} as const;

// Corresponding UploadThing size strings
export const UT_MAX_SIZES = {
  avatar:   "8MB",
  image:    "15MB",
  video:    "50MB",
  audio:    "8MB",
  document: "15MB",
  protocol: "50MB",
} as const;

export function getFileUrl(fileId: string): string {
  return `/api/files/${fileId}`;
}

export function isFileId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function resolveFileSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("/api/"))
    return value;
  if (isFileId(value)) return getFileUrl(value);
  return value;
}

export async function getFileMetadata(fileId: string) {
  const file = await db.file.findUnique({
    where:  { id: fileId },
    select: {
      id:        true,
      filename:  true,
      mimeType:  true,
      size:      true,
      type:      true,
      url:       true,
      createdAt: true,
    },
  });
  if (!file) return null;
  return { ...file, url: file.url ?? getFileUrl(file.id) };
}

export async function deleteFile(fileId: string): Promise<void> {
  const file = await db.file.findUnique({
    where:  { id: fileId },
    select: { storageKey: true, data: true },
  });

  // If the file was stored in UploadThing (has a storageKey and no data blob), delete it from UploadThing
  if (file?.storageKey && !file.data) {
    try {
      await utapi.deleteFiles(file.storageKey);
    } catch (err) {
      console.error("[file-utils] UploadThing deletion failed:", err);
    }
  }

  await db.file.delete({ where: { id: fileId } });
}

export async function listUserFiles(
    userId: string,
    options: { type?: FileType; page?: number; perPage?: number } = {}
) {
  const { type, page = 1, perPage = 20 } = options;
  const where = { userId, ...(type ? { type } : {}) };

  const [files, total] = await Promise.all([
    db.file.findMany({
      where,
      select: {
        id:        true,
        filename:  true,
        mimeType:  true,
        size:      true,
        type:      true,
        url:       true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * perPage,
      take:    perPage,
    }),
    db.file.count({ where }),
  ]);

  return {
    files: files.map((f) => ({ ...f, url: f.url ?? getFileUrl(f.id) })),
    total,
  };
}

export function validateFileSizeClient(
    file: File,
    category: keyof typeof MAX_FILE_SIZES
) {
  const limit = MAX_FILE_SIZES[category];
  if (file.size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `File exceeds ${limitMB} MB limit for ${category}.` };
  }
  return { valid: true };
}
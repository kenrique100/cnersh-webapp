import { db } from "@/lib/db";
import type { FileType } from "@/generated/prisma";

export const MAX_DOCUMENT_PAGES = 4;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const; // .doc and spreadsheets removed – not supported for page validation

export const MAX_FILE_SIZES = {
  avatar:   8  * 1024 * 1024,
  image:    16 * 1024 * 1024,
  video:    50 * 1024 * 1024,
  audio:    8  * 1024 * 1024,
  document: 10 * 1024 * 1024,
  protocol: 64 * 1024 * 1024,
} as const;

// UploadThing size strings – must match exact literal union
export const UT_MAX_SIZES = {
  avatar:   "8MB",
  image:    "16MB",
  video:    "50MB",
  audio:    "8MB",
  document: "10MB",
  protocol: "64MB",
} as const;


export function getFileUrl(fileId: string): string {
  return `/api/files/${fileId}`;
}

export function isFileId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isUploadThingUrl(value: string): boolean {
  try {
    if (!/^https?:\/\//i.test(value)) return false;
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "utfs.io" || hostname.endsWith(".utfs.io");
  } catch {
    return false;
  }
}

export function resolveFileSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("/api/") || isUploadThingUrl(value))
    return value;
  if (isFileId(value)) return getFileUrl(value);
  return value;
}

export async function getFileMetadata(fileId: string) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, filename: true, mimeType: true, size: true, type: true, url: true, createdAt: true },
  });
  if (!file) return null;
  return { ...file, url: file.url ?? getFileUrl(file.id) };
}

export async function deleteFile(fileId: string): Promise<void> {
  const file = await db.file.findUnique({ where: { id: fileId }, select: { url: true, data: true } });
  if (file?.url && !file.data) {
    try {
      const { UTApi } = await import("uploadthing/server");
      const key = file.url.split("/").pop();
      if (key) await new UTApi().deleteFiles([key]);
    } catch (err) {
      console.error("CDN deletion failed:", err);
    }
  }
  await db.file.delete({ where: { id: fileId } });
}

export async function listUserFiles(userId: string, options: { type?: FileType; page?: number; perPage?: number } = {}) {
  const { type, page = 1, perPage = 20 } = options;
  const where = { userId, ...(type ? { type } : {}) };
  const [files, total] = await Promise.all([
    db.file.findMany({
      where,
      select: { id: true, filename: true, mimeType: true, size: true, type: true, url: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.file.count({ where }),
  ]);
  return { files: files.map(f => ({ ...f, url: f.url ?? getFileUrl(f.id) })), total };
}

export function validateFileSizeClient(file: File, category: keyof typeof MAX_FILE_SIZES) {
  const limit = MAX_FILE_SIZES[category];
  if (file.size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `File exceeds ${limitMB} MB limit for ${category}.` };
  }
  return { valid: true };
}
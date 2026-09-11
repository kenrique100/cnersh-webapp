import { db } from "@/lib/db";
import { utapi } from "@/lib/uploadthing";
import type { FileType } from "@/generated/prisma";
import {
  MAX_DOCUMENT_PAGES,
  MAX_FILE_SIZES,
  UT_MAX_SIZES,
  type FileSizeCategory,
} from "@/lib/file-limits";

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export { MAX_DOCUMENT_PAGES, MAX_FILE_SIZES, UT_MAX_SIZES };
export type { FileSizeCategory };

export function getFileUrl(fileId: string): string {
  return `/api/files/${fileId}`;
}

export function isFileId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
  );
}

export function resolveFileSrc(
    value: string | null | undefined
): string | null {
  if (!value) return null;
  if (
      value.startsWith("data:") ||
      value.startsWith("http") ||
      value.startsWith("/api/")
  ) {
    return value;
  }
  if (isFileId(value)) return getFileUrl(value);
  return value;
}

export interface FileSizeValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Client-side pre-flight check. Call this before starting an upload
 * so users fail fast without wasting bandwidth.
 *
 * The `category` values map 1:1 to MAX_FILE_SIZES keys.
 */
export function validateFileSizeClient(
    file: File,
    category: FileSizeCategory
): FileSizeValidationResult {
  const limit = MAX_FILE_SIZES[category];
  if (file.size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File exceeds ${limitMB} MB limit for ${category}.`,
    };
  }
  return { valid: true };
}

/**
 * Server-side size check. Authoritative — UploadThing's own ceiling
 * may be more permissive (nearest power of two), so always re-check
 * here before persisting metadata or serving a file.
 */
export function validateFileSizeServer(
    sizeInBytes: number,
    category: FileSizeCategory
): FileSizeValidationResult {
  const limit = MAX_FILE_SIZES[category];
  if (sizeInBytes > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(0);
    const actualMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File is ${actualMB} MB, exceeds ${limitMB} MB limit for ${category}.`,
    };
  }
  return { valid: true };
}

export async function getFileMetadata(fileId: string) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      type: true,
      url: true,
      createdAt: true,
    },
  });
  if (!file) return null;
  return { ...file, url: file.url ?? getFileUrl(file.id) };
}

export async function deleteFile(fileId: string): Promise<void> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { storageKey: true },
  });

  if (file?.storageKey) {
    const deletion = await utapi.deleteFiles(file.storageKey);
    if (!deletion.success) {
      throw new Error("Storage provider did not confirm deletion");
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
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        type: true,
        url: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.file.count({ where }),
  ]);

  return {
    files: files.map((f) => ({ ...f, url: f.url ?? getFileUrl(f.id) })),
    total,
  };
}
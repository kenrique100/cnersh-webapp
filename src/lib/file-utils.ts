/**
 * file-utils.ts
 *
 * Centralised helpers for working with DB-stored files.
 * Import these instead of constructing /api/files URLs manually.
 */

import { db } from "@/lib/db";
import type { FileType } from "@/generated/prisma";

// ─── Types ─────────────────────────────────────────────────

export interface FileMetadata {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  type: FileType;
  url: string;
  createdAt: Date;
}

export interface FileUploadResult {
  fileId: string;
  url: string;
  name: string;
  type: string;
  size: number;
  category: FileType;
  createdAt: Date;
}

// ─── URL Helpers ────────────────────────────────────────────

/**
 * Returns the canonical URL for a stored file.
 * Use this everywhere instead of hard-coding /api/files paths.
 */
export function getFileUrl(fileId: string): string {
  return `/api/files/${fileId}`;
}

/**
 * Returns true if the string looks like a DB file ID (UUID)
 * rather than a legacy data: URL or an external URL.
 */
export function isFileId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Resolves a stored value (fileId, data: URL, or absolute URL) to a
 * displayable src string.  Pass through data: and http(s): URLs unchanged;
 * convert plain UUIDs to /api/files paths.
 */
export function resolveFileSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("data:") || value.startsWith("http")) return value;
  if (isFileId(value)) return getFileUrl(value);
  // Assume it is already a relative path
  return value;
}

// ─── Server-side DB Helpers ─────────────────────────────────
// Only call these from Server Components, API routes, or Server Actions.

/**
 * Fetches lightweight metadata for a file (no binary data).
 */
export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true },
  });
  if (!file) return null;
  return { ...file, url: getFileUrl(file.id) };
}

/**
 * Deletes a file record from the database.
 * Caller is responsible for verifying ownership before invoking.
 */
export async function deleteFile(fileId: string): Promise<void> {
  await db.file.delete({ where: { id: fileId } });
}

/**
 * Returns paginated file metadata for a user.
 */
export async function listUserFiles(
  userId: string,
  options: { type?: FileType; page?: number; perPage?: number } = {}
): Promise<{ files: FileMetadata[]; total: number }> {
  const { type, page = 1, perPage = 20 } = options;
  const where = { userId, ...(type ? { type } : {}) };

  const [files, total] = await Promise.all([
    db.file.findMany({
      where,
      select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.file.count({ where }),
  ]);

  return {
    files: files.map((f) => ({ ...f, url: getFileUrl(f.id) })),
    total,
  };
}

// ─── Validation Constants ───────────────────────────────────
// Keep in sync with the upload route.

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"] as const;
export const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"] as const;
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const MAX_FILE_SIZES: Record<string, number> = {
  avatar:   5  * 1024 * 1024,
  image:    5  * 1024 * 1024,
  video:    10 * 1024 * 1024,
  audio:    8  * 1024 * 1024,
  document: 10 * 1024 * 1024,
  protocol: 10 * 1024 * 1024,
};

/**
 * Quick client-side size check before hitting the upload endpoint.
 */
export function validateFileSizeClient(
  file: File,
  category: keyof typeof MAX_FILE_SIZES
): { valid: boolean; error?: string } {
  const limit = MAX_FILE_SIZES[category] ?? 10 * 1024 * 1024;
  if (file.size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `File exceeds the ${limitMB} MB limit for ${category} files.` };
  }
  return { valid: true };
}

/**
 * file-utils.ts
 *
 * Centralised helpers for working with files.
 * Supports both:
 *  - Legacy files: stored as base64 in DB, served via /api/files/[id]
 *  - UploadThing files: stored as CDN URLs in DB, accessed directly
 */

import { db } from "@/lib/db";
import type { FileType } from "@/generated/prisma";

// ─── Types ─────────────────────────────────────────────────────────────────

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

// ─── URL Helpers ───────────────────────────────────────────────────────────

/** Returns the canonical serving URL for a stored file. */
export function getFileUrl(fileId: string): string {
  return `/api/files/${fileId}`;
}

/** Returns true if the string looks like a UUID (DB file ID). */
export function isFileId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Returns true if the URL is a direct UploadThing CDN URL. */
export function isUploadThingUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "utfs.io" ||
      hostname.endsWith(".utfs.io") ||
      hostname === "ufs.sh" ||
      hostname.endsWith(".ufs.sh") ||
      hostname === "uploadthing.com" ||
      hostname.endsWith(".uploadthing.com")
    );
  } catch {
    return false;
  }
}

/**
 * Resolves a stored value (fileId, data URL, UploadThing URL, or absolute URL)
 * to a displayable src string.
 *  - UploadThing / http(s) / data: URLs  → returned as-is (direct CDN access)
 *  - /api/... paths                       → returned as-is
 *  - Plain UUIDs                          → converted to /api/files/[id]
 */
export function resolveFileSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (
    value.startsWith("data:") ||
    value.startsWith("http") ||
    value.startsWith("/api/") ||
    isUploadThingUrl(value)
  ) {
    return value;
  }
  if (isFileId(value)) return getFileUrl(value);
  return value;
}

// ─── Server-side DB Helpers ─────────────────────────────────────────────────
// Only call these from Server Components, API routes, or Server Actions.

/** Fetches lightweight metadata for a file (no binary data). */
export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, filename: true, mimeType: true, size: true, type: true, url: true, createdAt: true },
  });
  if (!file) return null;
  // Prefer the stored URL (UploadThing CDN), fall back to the legacy API route
  const resolvedUrl = file.url ?? getFileUrl(file.id);
  return { ...file, url: resolvedUrl };
}

/**
 * Deletes a file record from the DB.
 * For UploadThing-stored files, also deletes from the CDN via UTApi.
 * Caller must verify ownership first.
 */
export async function deleteFile(fileId: string): Promise<void> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { url: true, data: true },
  });

  // If it's an UploadThing file (has url, no base64 data), delete from CDN
  if (file?.url && !file.data) {
    try {
      const { UTApi } = await import("uploadthing/server");
      const utapi = new UTApi();
      // Extract the file key from the URL (last path segment)
      const key = file.url.split("/").pop();
      if (key) await utapi.deleteFiles([key]);
    } catch (err) {
      console.error("[file-utils] Failed to delete file from UploadThing CDN:", err);
      // Non-fatal: still delete the DB record below
    }
  }

  await db.file.delete({ where: { id: fileId } });
}

/** Returns paginated file metadata for a user. */
export async function listUserFiles(
  userId: string,
  options: { type?: FileType; page?: number; perPage?: number } = {}
): Promise<{ files: FileMetadata[]; total: number }> {
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

  return {
    files: files.map((f) => ({ ...f, url: f.url ?? getFileUrl(f.id) })),
    total,
  };
}

// ─── Validation Constants ──────────────────────────────────────────────────
// Keep in sync with the upload route and core.ts UploadThing router.

export const ALLOWED_IMAGE_TYPES    = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const ALLOWED_VIDEO_TYPES    = ["video/mp4", "video/webm", "video/ogg"] as const;
export const ALLOWED_AUDIO_TYPES    = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"] as const;
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const MAX_FILE_SIZES: Record<string, number> = {
  avatar:   10 * 1024 * 1024,
  image:    10 * 1024 * 1024,
  video:    50 * 1024 * 1024,
  audio:     8 * 1024 * 1024,
  document: 20 * 1024 * 1024,
  protocol: 20 * 1024 * 1024,
};

/**
 * Quick client-side size check before hitting the upload endpoint.
 * Call this in your file-picker onChange handler to show an error
 * before wasting bandwidth on a doomed upload.
 */
export function validateFileSizeClient(
  file: File,
  category: keyof typeof MAX_FILE_SIZES
): { valid: boolean; error?: string } {
  const limit = MAX_FILE_SIZES[category] ?? 20 * 1024 * 1024;
  if (file.size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `File exceeds the ${limitMB} MB limit for ${category} files.` };
  }
  return { valid: true };
}

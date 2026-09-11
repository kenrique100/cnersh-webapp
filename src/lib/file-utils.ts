import { MAX_FILE_SIZES, type FileSizeCategory } from "@/lib/file-limits";

export interface FileSizeValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Client-side pre-flight check. Used in file pickers to fail fast
 * before uploading to UploadThing.
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
 * Server-side check. Use in:
 *  - UploadThing `onUploadComplete` before persisting metadata
 *  - /api/files upload handlers
 *  - Anywhere a size value comes from an untrusted source
 *
 * Note: UploadThing's own `maxFileSize` may be more permissive
 * (nearest power of two). This is the authoritative limit.
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
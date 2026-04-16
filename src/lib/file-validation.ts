/**
 * file-validation.ts
 *
 * File type validation using raw magic-byte inspection.
 *
 * WHY NOT `file-type` npm package?
 * The `file-type` package v19+ is pure ESM and cannot be imported in
 * Next.js API routes (Node.js CJS runtime) without complex transpile
 * config. We implement the same magic-byte checks inline to avoid the
 * ESM/CJS mismatch that was causing the 500 error on /api/upload.
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
}

// ─── Magic byte signatures ─────────────────────────────────────────────────
// Each entry: [mimeType, offset, ...bytes]
// offset = byte position where the signature starts
const MAGIC_SIGNATURES: Array<{ mime: string; offset: number; bytes: number[] }> = [
  // Images
  { mime: "image/jpeg",  offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",   offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif",   offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { mime: "image/webp",  offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF (webp verified below)
  // Videos
  { mime: "video/mp4",   offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ftyp box
  { mime: "video/webm",  offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }, // EBML
  { mime: "video/ogg",   offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }, // OggS
  // Audio
  { mime: "audio/mpeg",  offset: 0, bytes: [0xff, 0xfb] },             // MP3 frame sync
  { mime: "audio/mpeg",  offset: 0, bytes: [0x49, 0x44, 0x33] },       // ID3 tag
  { mime: "audio/wav",   offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF (wav verified below)
  { mime: "audio/ogg",   offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }, // OggS
  { mime: "audio/mp4",   offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ftyp box (m4a)
  // Documents
  { mime: "application/pdf",    offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: "application/msword", offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] }, // OLE2 (doc)
  // OOXML (docx/xlsx): ZIP signature — resolved to specific type via filename extension
  { mime: "application/zip", offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
];

// OOXML MIME types that arrive as ZIP containers
const OOXML_TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const MAX_IMAGE_SIZE  = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_SIZE  =  8 * 1024 * 1024; //  8 MB
const MAX_VIDEO_SIZE  = 50 * 1024 * 1024; // 50 MB
const MAX_DOC_SIZE    = 20 * 1024 * 1024; // 20 MB

export const ALLOWED_FILE_TYPES: Record<string, { extensions: string[]; maxSize: number }> = {
  "image/jpeg":   { extensions: ["jpg", "jpeg"], maxSize: MAX_IMAGE_SIZE },
  "image/png":    { extensions: ["png"],          maxSize: MAX_IMAGE_SIZE },
  "image/gif":    { extensions: ["gif"],          maxSize: MAX_IMAGE_SIZE },
  "image/webp":   { extensions: ["webp"],         maxSize: MAX_IMAGE_SIZE },
  "video/mp4":    { extensions: ["mp4"],          maxSize: MAX_VIDEO_SIZE },
  "video/webm":   { extensions: ["webm"],         maxSize: MAX_VIDEO_SIZE },
  "video/ogg":    { extensions: ["ogv", "ogg"],   maxSize: MAX_VIDEO_SIZE },
  "audio/mpeg":   { extensions: ["mp3"],          maxSize: MAX_AUDIO_SIZE },
  "audio/wav":    { extensions: ["wav"],          maxSize: MAX_AUDIO_SIZE },
  "audio/ogg":    { extensions: ["oga"],          maxSize: MAX_AUDIO_SIZE },
  "audio/webm":   { extensions: ["weba"],         maxSize: MAX_AUDIO_SIZE },
  "audio/mp4":    { extensions: ["m4a"],          maxSize: MAX_AUDIO_SIZE },
  "application/pdf":     { extensions: ["pdf"],  maxSize: MAX_DOC_SIZE },
  "application/msword":  { extensions: ["doc"],  maxSize: MAX_DOC_SIZE },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { extensions: ["docx"], maxSize: MAX_DOC_SIZE },
  "application/vnd.ms-excel": { extensions: ["xls"], maxSize: MAX_DOC_SIZE },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { extensions: ["xlsx"], maxSize: MAX_DOC_SIZE },
};

/**
 * Detect MIME type from raw file bytes using magic numbers.
 * Returns null if no signature matches.
 */
function detectMimeFromBuffer(buf: Buffer, filename: string): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buf.subarray(sig.offset, sig.offset + sig.bytes.length);
    if (slice.length < sig.bytes.length) continue;
    const match = sig.bytes.every((b, i) => slice[i] === b);
    if (!match) continue;

    // Disambiguate RIFF container: WebP vs WAV
    if (sig.mime === "image/webp") {
      if (buf.length >= 12 && buf.subarray(8, 12).toString("ascii") === "WEBP") {
        return "image/webp";
      }
      continue;
    }
    if (sig.mime === "audio/wav") {
      if (buf.length >= 12 && buf.subarray(8, 12).toString("ascii") === "WAVE") {
        return "audio/wav";
      }
      continue;
    }

    // Resolve ZIP-based OOXML by file extension
    if (sig.mime === "application/zip") {
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      return OOXML_TYPES[ext] ?? "application/zip";
    }

    return sig.mime;
  }
  return null;
}

/**
 * Validate file type by inspecting magic bytes.
 * Does NOT rely on the `file-type` npm package (ESM-only, breaks in CJS).
 */
export async function validateFileType(
  file: File | Buffer,
  allowedTypes?: string[]
): Promise<FileValidationResult> {
  try {
    let buffer: Buffer;
    let filename = "";

    if (file instanceof File) {
      const ab = await file.arrayBuffer();
      // Only read first 16 KB — enough for all magic byte checks
      buffer = Buffer.from(ab.slice(0, 16 * 1024));
      filename = file.name;
    } else {
      buffer = file.subarray(0, 16 * 1024) as Buffer;
    }

    const detectedMime = detectMimeFromBuffer(buffer, filename);

    if (!detectedMime) {
      return { valid: false, error: "Could not determine file type from content" };
    }

    const allowed = allowedTypes ?? Object.keys(ALLOWED_FILE_TYPES);
    if (!allowed.includes(detectedMime)) {
      return {
        valid: false,
        error: `File type "${detectedMime}" is not allowed`,
        detectedType: detectedMime,
      };
    }

    return { valid: true, detectedType: detectedMime };
  } catch (err) {
    return {
      valid: false,
      error: `File validation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

/**
 * Validate file size against per-type or custom limit.
 */
export function validateFileSize(file: File, maxSize?: number): FileValidationResult {
  const limit =
    maxSize ??
    (ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]?.maxSize ??
      50 * 1024 * 1024);

  if (file.size > limit) {
    return {
      valid: false,
      error: `File size ${(file.size / (1024 * 1024)).toFixed(2)} MB exceeds the ${(limit / (1024 * 1024)).toFixed(0)} MB limit`,
    };
  }
  return { valid: true };
}

/**
 * Combined size + type validation. Entry point used by the upload route.
 * Accepts a pre-read Buffer to avoid consuming the File stream multiple times.
 */
export async function validateFile(
  buffer: Buffer,
  file: File,
  options: { allowedTypes?: string[]; maxSize?: number } = {}
): Promise<FileValidationResult> {
  // 1. Size check first (cheap)
  const sizeResult = validateFileSize(file, options.maxSize);
  if (!sizeResult.valid) return sizeResult;

  // 2. Magic-byte type check using the pre-read buffer
  const typeResult = await validateFileType(buffer, options.allowedTypes);
  if (!typeResult.valid) return typeResult;

  // 3. Security checks
  const secResult = performSecurityChecks(file);
  if (!secResult.valid) return secResult;

  return { valid: true, detectedType: typeResult.detectedType };
}

/**
 * Filename security checks: null bytes, path traversal, length.
 */
function performSecurityChecks(file: File): FileValidationResult {
  if (file.name.includes("\0")) {
    return { valid: false, error: "Filename contains null bytes" };
  }
  if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) {
    return { valid: false, error: "Filename contains invalid characters" };
  }
  if (file.name.length > 255) {
    return { valid: false, error: "Filename too long (max 255 characters)" };
  }
  return { valid: true };
}

/**
 * Basic malware heuristic: blocks executables, PHP, and shell scripts.
 * NOT a replacement for proper virus scanning.
 * Accepts either a pre-read Buffer (preferred) or a File.
 */
export async function performBasicMalwareCheck(fileOrBuffer: File | Buffer): Promise<FileValidationResult> {
  try {
    let buffer: Buffer;
    if (Buffer.isBuffer(fileOrBuffer)) {
      buffer = fileOrBuffer.subarray(0, 512);
    } else {
      const ab = await fileOrBuffer.arrayBuffer();
      buffer = Buffer.from(ab.slice(0, 512)); // Only need the first 512 bytes
    }

    const suspiciousPatterns: Buffer[] = [
      Buffer.from("MZ",          "ascii"), // Windows PE executable
      Buffer.from("#!/bin/bash", "ascii"), // Bash script
      Buffer.from("#!/bin/sh",   "ascii"), // Shell script
      Buffer.from("<?php",       "ascii"), // PHP script
    ];

    for (const pattern of suspiciousPatterns) {
      if (buffer.subarray(0, pattern.length).equals(pattern)) {
        return { valid: false, error: "File appears to contain executable code" };
      }
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Security check failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

/**
 * Returns allowed MIME types for a category.
 */
export function getAllowedFileTypes(
  category: "image" | "video" | "audio" | "document"
): string[] {
  const types = Object.keys(ALLOWED_FILE_TYPES);
  switch (category) {
    case "image":    return types.filter((t) => t.startsWith("image/"));
    case "video":    return types.filter((t) => t.startsWith("video/"));
    case "audio":    return types.filter((t) => t.startsWith("audio/"));
    case "document": return types.filter((t) => t.startsWith("application/"));
    default:         return types;
  }
}

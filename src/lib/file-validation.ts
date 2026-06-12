import { PDFParse } from 'pdf-parse';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
  pageCount?: number;
}

const MAGIC_SIGNATURES: Array<{ mime: string; offset: number; bytes: number[] }> = [
  { mime: "image/jpeg",  offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",   offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif",   offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp",  offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "video/mp4",   offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: "video/webm",  offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  { mime: "video/ogg",   offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] },
  { mime: "audio/mpeg",  offset: 0, bytes: [0xff, 0xfb] },
  { mime: "audio/mpeg",  offset: 0, bytes: [0x49, 0x44, 0x33] },
  { mime: "audio/wav",   offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "audio/ogg",   offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] },
  { mime: "audio/mp4",   offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: "application/pdf",    offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "application/msword", offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] },
  { mime: "application/zip",    offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
];

const OOXML_TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_AUDIO_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_DOC_SIZE   = 20 * 1024 * 1024;

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

function detectMimeFromBuffer(buf: Buffer, filename: string): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buf.subarray(sig.offset, sig.offset + sig.bytes.length);
    if (slice.length < sig.bytes.length) continue;
    const match = sig.bytes.every((b, i) => slice[i] === b);
    if (!match) continue;

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
    if (sig.mime === "application/zip") {
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      return OOXML_TYPES[ext] ?? "application/zip";
    }
    return sig.mime;
  }
  return null;
}

async function validatePdfPageCount(buffer: Buffer, maxPages: number): Promise<{ valid: boolean; error?: string; pageCount?: number }> {
  try {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const pageCount = data.pages?.length ?? 0;
    if (!pageCount || pageCount === 0) {
      return { valid: false, error: "The uploaded PDF appears to be empty (0 pages).", pageCount: 0 };
    }
    if (pageCount > maxPages) {
      return { valid: false, error: `Document exceeds the maximum allowed ${maxPages} pages. Current page count: ${pageCount}.`, pageCount };
    }
    return { valid: true, pageCount };
  } catch (err) {
    return { valid: false, error: `Failed to read PDF document: ${err instanceof Error ? err.message : "Invalid PDF format"}` };
  } finally {
    // no-op
  }
}

async function validateDocxPageCount(buffer: Buffer, maxPages: number): Promise<{ valid: boolean; error?: string; pageCount?: number }> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
      return { valid: false, error: "Invalid DOCX file: missing document.xml" };
    }
    const xmlContent = await documentXml.async('text');
    const pageBreakMatches = xmlContent.match(/<w:br\s+w:type="page"\s*\/>/gi) || [];
    const pageCount = pageBreakMatches.length + 1;
    if (pageCount > maxPages) {
      return { valid: false, error: `Document exceeds the maximum allowed ${maxPages} pages. Estimated page count: ${pageCount}.`, pageCount };
    }
    return { valid: true, pageCount };
  } catch (err) {
    return { valid: false, error: `Failed to parse DOCX file: ${err instanceof Error ? err.message : "Invalid DOCX format"}` };
  }
}

async function validateDocumentPageCount(buffer: Buffer, mimeType: string, maxPages: number): Promise<{ valid: boolean; error?: string; pageCount?: number }> {
  if (mimeType === "application/pdf") {
    return validatePdfPageCount(buffer, maxPages);
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return validateDocxPageCount(buffer, maxPages);
  }
  if (mimeType === "application/msword") {
    return { valid: false, error: "Binary .doc files are not supported for page count validation. Please convert to PDF or DOCX." };
  }
  return { valid: true };
}

export async function validateFileType(file: File | Buffer, allowedTypes?: string[]): Promise<FileValidationResult> {
  try {
    let buffer: Buffer;
    let filename = "";
    if (file instanceof File) {
      const ab = await file.arrayBuffer();
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
      return { valid: false, error: `File type "${detectedMime}" is not allowed`, detectedType: detectedMime };
    }
    return { valid: true, detectedType: detectedMime };
  } catch (err) {
    return { valid: false, error: `File validation failed: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

export function validateFileSize(file: File, maxSize?: number): FileValidationResult {
  const limit = maxSize ?? (ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]?.maxSize ?? 50 * 1024 * 1024);
  if (file.size > limit) {
    return { valid: false, error: `File size ${(file.size / (1024 * 1024)).toFixed(2)} MB exceeds the ${(limit / (1024 * 1024)).toFixed(0)} MB limit` };
  }
  return { valid: true };
}

export async function validateFile(
    buffer: Buffer,
    file: File,
    options: { allowedTypes?: string[]; maxSize?: number; maxPages?: number } = {}
): Promise<FileValidationResult> {
  const sizeResult = validateFileSize(file, options.maxSize);
  if (!sizeResult.valid) return sizeResult;

  const typeResult = await validateFileType(buffer, options.allowedTypes);
  if (!typeResult.valid) return typeResult;

  const maxPages = options.maxPages ?? 4;
  if (typeResult.detectedType && (typeResult.detectedType === "application/pdf" || typeResult.detectedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || typeResult.detectedType === "application/msword")) {
    const pageValidation = await validateDocumentPageCount(buffer, typeResult.detectedType, maxPages);
    if (!pageValidation.valid) {
      return { valid: false, error: pageValidation.error };
    }
  }

  const secResult = performSecurityChecks(file);
  if (!secResult.valid) return secResult;

  return { valid: true, detectedType: typeResult.detectedType };
}

function performSecurityChecks(file: File): FileValidationResult {
  if (file.name.includes("\0")) return { valid: false, error: "Filename contains null bytes" };
  if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) return { valid: false, error: "Filename contains invalid characters" };
  if (file.name.length > 255) return { valid: false, error: "Filename too long (max 255 characters)" };
  return { valid: true };
}

export async function performBasicMalwareCheck(fileOrBuffer: File | Buffer): Promise<FileValidationResult> {
  try {
    let buffer: Buffer;
    if (Buffer.isBuffer(fileOrBuffer)) {
      buffer = fileOrBuffer.subarray(0, 512);
    } else {
      const ab = await fileOrBuffer.arrayBuffer();
      buffer = Buffer.from(ab.slice(0, 512));
    }
    const suspiciousPatterns: Buffer[] = [
      Buffer.from("MZ", "ascii"),
      Buffer.from("#!/bin/bash", "ascii"),
      Buffer.from("#!/bin/sh", "ascii"),
      Buffer.from("<?php", "ascii"),
    ];
    for (const pattern of suspiciousPatterns) {
      if (buffer.subarray(0, pattern.length).equals(pattern)) {
        return { valid: false, error: "File appears to contain executable code" };
      }
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Security check failed: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}
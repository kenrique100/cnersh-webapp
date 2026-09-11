import { NextRequest, NextResponse } from "next/server";
import { authSession } from "@/lib/auth-utils";
import { performBasicMalwareCheck, validateMimeType } from "@/lib/file-validation";
import { sanitizeFilename } from "@/lib/sanitize-filename";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withIdempotency } from "@/middleware/idempotency";
import { db } from "@/lib/db";
import { utapi } from "@/lib/uploadthing";
import type { FileType } from "@/generated/prisma";
import { PDFDocument } from "pdf-lib";

export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_IMAGE_SIZE    = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE    = 64 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_AUDIO_SIZE    =  8 * 1024 * 1024;
const requestSessions = new WeakMap<NextRequest, ReturnType<typeof authSession>>();

function getRequestSession(req: NextRequest): ReturnType<typeof authSession> {
  const existing = requestSessions.get(req);
  if (existing) return existing;
  const pending = authSession();
  requestSessions.set(req, pending);
  return pending;
}

async function cleanupUploadedFile(storageKey: string): Promise<void> {
  try {
    const deletion = await utapi.deleteFiles(storageKey);
    if (!deletion.success) {
      throw new Error("Storage provider did not confirm deletion");
    }
  } catch (error) {
    // The DB insert did not happen, so this object is now orphaned. Keep the
    // storage key in server logs so operators can remove it manually.
    console.error("[upload] failed to compensate orphaned storage object:", storageKey, error);
  }
}

const ALLOWED_TYPES: Record<string, string[]> = {
  "image/": ["image/jpeg", "image/png", "image/gif", "image/webp"],
  "video/": ["video/mp4", "video/webm", "video/ogg"],
  "audio/": ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"],
  "doc": [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

const MAX_SIZES: Record<string, number> = {
  "image/": MAX_IMAGE_SIZE,
  "video/": MAX_VIDEO_SIZE,
  "audio/": MAX_AUDIO_SIZE,
  "doc":    MAX_DOCUMENT_SIZE,
};

function getCategory(mimeType: string): "image/" | "video/" | "audio/" | "doc" {
  if (mimeType.startsWith("image/")) return "image/";
  if (mimeType.startsWith("video/")) return "video/";
  if (mimeType.startsWith("audio/")) return "audio/";
  return "doc";
}

function resolveFileType(mimeType: string): FileType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

async function uploadHandler(req: NextRequest): Promise<NextResponse> {
  const session = await getRequestSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const sanitizedFilename = sanitizeFilename(file.name);
  if (!sanitizedFilename || sanitizedFilename === "unnamed") {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const category     = getCategory(file.type);
  const allowedTypes = ALLOWED_TYPES[category];
  const maxSize      = MAX_SIZES[category];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
        { error: `File type ${file.type} is not allowed.` },
        { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }

  if (file.size > maxSize) {
    return NextResponse.json({ error: "File exceeds size limit." }, { status: 400 });
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Failed to read file data" }, { status: 500 });
  }

  if (!validateMimeType(fileBuffer, file.type)) {
    return NextResponse.json(
        { error: "File content does not match declared type." },
        { status: 400 }
    );
  }

  const malwareCheck = await performBasicMalwareCheck(fileBuffer, file.name);
  if (!malwareCheck.safe) {
    return NextResponse.json(
        { error: malwareCheck.error ?? "File failed security check" },
        { status: 400 }
    );
  }

  // PDF Page Count Validation (1-4 pages required)
  if (file.type === "application/pdf") {
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pageCount = pdfDoc.getPageCount();

      if (pageCount === 0) {
        return NextResponse.json(
            { error: "PDF is empty (0 pages). Please upload a PDF with at least 1 page." },
            { status: 400 }
        );
      }

      if (pageCount > 4) {
        return NextResponse.json(
            { error: `PDF has ${pageCount} pages. Maximum allowed is 4 pages.` },
            { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid or corrupted PDF file" }, { status: 400 });
    }
  }

  let uploadResult;
  try {
    const uploadFile = new File(
        [new Uint8Array(fileBuffer)],
        sanitizedFilename,
        { type: file.type }
    );
    uploadResult = await utapi.uploadFiles(uploadFile);
  } catch (err) {
    console.error("[upload] UploadThing upload failed:", err);
    return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 502 });
  }

  if (uploadResult.error) {
    console.error("[upload] UploadThing error:", uploadResult.error);
    return NextResponse.json({ error: "Upload service error" }, { status: 502 });
  }

  const uploadedData = uploadResult.data as typeof uploadResult.data & {
    ufsUrl?: string;
    url?: string;
  };
  const key = uploadedData.key;
  const uploadedUrl = uploadedData.ufsUrl ?? uploadedData.url;
  if (!uploadedUrl) {
    console.error("[upload] upload response did not include a file URL");
    await cleanupUploadedFile(key);
    return NextResponse.json({ error: "Upload service error" }, { status: 502 });
  }

  try {
    const stored = await db.file.create({
      data: {
        filename:   sanitizedFilename,
        mimeType:   file.type,
        size:       file.size,
        data:       null,
        url:        uploadedUrl,
        storageKey: key,
        type:       resolveFileType(file.type),
        userId:     session.user.id,
      },
      select: {
        id:        true,
        filename:  true,
        mimeType:  true,
        size:      true,
        type:      true,
        createdAt: true,
        url:       true,
      },
    });

    return NextResponse.json({
      fileId:    stored.id,
      url:       stored.url,
      name:      stored.filename,
      type:      stored.mimeType,
      size:      stored.size,
      category:  stored.type,
      createdAt: stored.createdAt,
    });
  } catch (err) {
    console.error("[upload] DB write failed:", err);
    await cleanupUploadedFile(key);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}

const rateLimitedHandler = withRateLimit(uploadHandler, RATE_LIMITS.fileUpload, {
  keyPrefix: "upload",
  getUserId: async (req) => {
    const session = await getRequestSession(req);
    return session?.user?.id;
  },
});

const idempotentHandler = withIdempotency(rateLimitedHandler, {
  lockTtlSeconds:     120,
  responseTtlSeconds: 86_400,
  getScope: async (req) => {
    const session = await getRequestSession(req);
    return session?.user?.id;
  },
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    return await idempotentHandler(req);
  } catch (err) {
    console.error("[upload] unexpected error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

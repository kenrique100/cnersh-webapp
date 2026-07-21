import { NextRequest, NextResponse } from "next/server";
import { authSession } from "@/lib/auth-utils";
import { performBasicMalwareCheck, validateMimeType } from "@/lib/file-validation";
import { sanitizeFilename } from "@/lib/sanitize-filename";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withIdempotency } from "@/middleware/idempotency";
import { db } from "@/lib/db";
import type { FileType } from "@/generated/prisma";
import { pdf } from "pdf-page-counter";
import { utapi } from "@/lib/uploadthing";

export const maxDuration = 60;
export const runtime = "nodejs";

// Updated max sizes per your requirements
const MAX_IMAGE_SIZE    = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_SIZE    = 50 * 1024 * 1024; // 50 MB
const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_AUDIO_SIZE    =  8 * 1024 * 1024; // 8 MB

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
  const session = await authSession();
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

  if (file.type === "application/pdf") {
    try {
      const pdfDoc = await pdf(fileBuffer);
      if (pdfDoc.numpages > 4) {
        return NextResponse.json({ error: "PDF exceeds 4 pages" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid or corrupted PDF file" }, { status: 400 });
    }
  }

  // Upload to UploadThing
  let uploadedFile: { url: string; key: string };
  try {
    const result = await utapi.uploadFiles(file);
    if (result.error) {
      throw new Error(result.error.message);
    }
    uploadedFile = {
      url: result.data.ufsUrl,
      key: result.data.key,
    };
  } catch (err) {
    console.error("[upload] UploadThing upload failed:", err);
    return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 502 });
  }

  try {
    const stored = await db.file.create({
      data: {
        filename:   sanitizedFilename,
        mimeType:   file.type,
        size:       file.size,
        data:       null,
        url:        uploadedFile.url,
        storageKey: uploadedFile.key,
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
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}

const rateLimitedHandler = withRateLimit(uploadHandler, RATE_LIMITS.fileUpload, {
  keyPrefix: "upload",
  getUserId: async () => {
    const session = await authSession();
    return session?.user?.id;
  },
});

const idempotentHandler = withIdempotency(rateLimitedHandler, {
  lockTtlSeconds:     60,
  responseTtlSeconds: 86_400,
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    return await idempotentHandler(req);
  } catch (err) {
    console.error("[upload] unexpected error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
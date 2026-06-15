import { NextRequest, NextResponse } from "next/server";
import { authSession } from "@/lib/auth-utils";
import { validateFile, performBasicMalwareCheck } from "@/lib/file-validation";
import { sanitizeFilename } from "@/lib/sanitize";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import type { FileType } from "@/generated/prisma";

export const maxDuration = 60;

const MAX_IMAGE_SIZE    = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE    = 50 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_AUDIO_SIZE    =  8 * 1024 * 1024;

function resolveFileType(mimeType: string): FileType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

async function uploadHandler(req: NextRequest): Promise<NextResponse> {
  const session = await authSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!sanitizedFilename) return NextResponse.json({ error: "Invalid filename" }, { status: 400 });

  let allowedTypes: string[];
  let maxSize: number;

  if (file.type.startsWith("video/")) {
    allowedTypes = ["video/mp4", "video/webm", "video/ogg"];
    maxSize = MAX_VIDEO_SIZE;
  } else if (file.type.startsWith("image/")) {
    allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    maxSize = MAX_IMAGE_SIZE;
  } else if (file.type.startsWith("audio/")) {
    allowedTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"];
    maxSize = MAX_AUDIO_SIZE;
  } else {
    allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    maxSize = MAX_DOCUMENT_SIZE;
  }

  // 1. Native Size and Type Verification
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: `File type ${file.type} is not allowed.` }, { status: 400 });
  }
  if (file.size > maxSize) {
    return NextResponse.json({ error: `File exceeds size limit.` }, { status: 400 });
  }

  let fileBuffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json({ error: "Failed to read file data" }, { status: 500 });
  }

  // 2. Fixed Malware Check (Passes both buffer and filename, checks .safe)
  const malwareCheck = await performBasicMalwareCheck(fileBuffer, file.name);
  if (!malwareCheck.safe) {
    return NextResponse.json({ error: malwareCheck.error || "File failed security check" }, { status: 400 });
  }

  // 3. Fixed validateFile (Only accepts maxPages, and only runs if it's a document)
  const fileCategory = resolveFileType(file.type);
  if (fileCategory === "document") {
    const validation = await validateFile(fileBuffer, file, { maxPages: 4 }) as { valid: boolean; error?: string };

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error ?? "Document validation failed" }, { status: 400 });
    }
  }

  const base64 = fileBuffer.toString("base64");
  const mimeType = file.type || "application/octet-stream";

  try {
    const stored = await db.file.create({
      data: {
        filename: sanitizedFilename,
        mimeType,
        size: file.size,
        data: base64,
        url: null,
        type: fileCategory,
        userId: session.user.id,
      },
      select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true },
    });
    return NextResponse.json({
      fileId: stored.id,
      url: `/api/files/${stored.id}`,
      name: stored.filename,
      type: stored.mimeType,
      size: stored.size,
      category: stored.type,
      createdAt: stored.createdAt,
    });
  } catch (err) {
    console.error("[upload] DB write failed:", err);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}

const rateLimitedUploadHandler = withRateLimit(uploadHandler, RATE_LIMITS.fileUpload, {
  keyPrefix: "upload",
  getUserId: async () => {
    const session = await authSession();
    return session?.user?.id;
  },
});

export async function POST(req: NextRequest) {
  try {
    return await rateLimitedUploadHandler(req);
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
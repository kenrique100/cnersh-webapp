/**
 * /api/upload  (legacy compatibility shim)
 *
 * This route is kept for backward compatibility with any existing client code
 * that posts directly to /api/upload. New code should use UploadThing via
 * useUploadThing() or <UploadButton> from @/lib/uploadthing.
 *
 * On Vercel this route WILL hit the 4.5 MB body limit for large files.
 * Migrate callers to UploadThing endpoints to support files up to 50 MB.
 */
import { NextRequest, NextResponse } from "next/server";
import { authSession } from "@/lib/auth-utils";
import { validateFile, performBasicMalwareCheck } from "@/lib/file-validation";
import { sanitizeFilename } from "@/lib/sanitize";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const maxDuration = 60;
export const maxRequestBodySize = 60 * 1024 * 1024; // 60 MB (effective on local/Docker only)

const MAX_IMAGE_SIZE    = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE    = 50 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
const MAX_AUDIO_SIZE    =  8 * 1024 * 1024;

type FileTypeValue = "avatar" | "protocol" | "document" | "image" | "video" | "audio";

function resolveFileType(mimeType: string): FileTypeValue {
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
  } catch (err) {
    console.error("[upload] formData parse error:", err);
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const sanitizedFilename = sanitizeFilename(file.name);
  if (!sanitizedFilename) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

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

  let fileBuffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[upload] file read error:", err);
    return NextResponse.json({ error: "Failed to read file data" }, { status: 500 });
  }

  let validation: Awaited<ReturnType<typeof validateFile>>;
  try {
    validation = await validateFile(fileBuffer, file, { allowedTypes, maxSize });
  } catch (err) {
    console.error("[upload] validateFile threw:", err);
    return NextResponse.json({ error: "File validation error" }, { status: 500 });
  }

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error ?? "File validation failed" },
      { status: 400 }
    );
  }

  let malwareCheck: Awaited<ReturnType<typeof performBasicMalwareCheck>>;
  try {
    malwareCheck = await performBasicMalwareCheck(fileBuffer);
  } catch (err) {
    console.error("[upload] malwareCheck threw:", err);
    return NextResponse.json({ error: "Security check error" }, { status: 500 });
  }

  if (!malwareCheck.valid) {
    return NextResponse.json({ error: "File failed security check" }, { status: 400 });
  }

  const base64 = fileBuffer.toString("base64");
  const mimeType = validation.detectedType ?? file.type ?? "application/octet-stream";
  const fileType = resolveFileType(mimeType);

  try {
    const stored = await db.file.create({
      data: {
        filename:  sanitizedFilename,
        mimeType,
        size:      file.size,
        data:      base64,
        url:       null,
        type:      fileType as any,
        userId:    session.user.id,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        type: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      fileId:    stored.id,
      url:       `/api/files/${stored.id}`,
      name:      stored.filename,
      type:      stored.mimeType,
      size:      stored.size,
      category:  stored.type,
      createdAt: stored.createdAt,
    });
  } catch (err) {
    console.error("[upload] DB write failed:", err);
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("relation") || msg.includes("table") || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Database table not found. Run `prisma migrate deploy` and redeploy." },
        { status: 500 }
      );
    }
    if (msg.includes("connect") || msg.includes("timeout") || msg.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: "Database connection failed. Check DATABASE_URL environment variable." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}

const rateLimitedUploadHandler = withRateLimit(
  uploadHandler,
  RATE_LIMITS.fileUpload,
  {
    keyPrefix: "upload",
    getUserId: async () => {
      const session = await authSession();
      return session?.user?.id;
    },
  }
);

export async function POST(req: NextRequest) {
  try {
    return await rateLimitedUploadHandler(req);
  } catch (err) {
    console.error("[upload] Unhandled rate-limiter error:", err);
    try {
      return await uploadHandler(req);
    } catch (handlerErr) {
      console.error("[upload] Fallback handler error:", handlerErr);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }
}

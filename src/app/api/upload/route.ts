import { NextRequest, NextResponse } from "next/server";
import { authSession } from "@/lib/auth-utils";
import { validateFile, performBasicMalwareCheck } from "@/lib/file-validation";
import { sanitizeFilename } from "@/lib/sanitize";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import type { FileType } from "@/generated/prisma";

export const maxDuration = 60;

// Per-category size limits (bytes)
const SIZE_LIMITS: Record<string, number> = {
  "image/jpeg": 5 * 1024 * 1024,
  "image/png":  5 * 1024 * 1024,
  "image/gif":  5 * 1024 * 1024,
  "image/webp": 5 * 1024 * 1024,
  "video/mp4":  10 * 1024 * 1024,
  "video/webm": 10 * 1024 * 1024,
  "video/ogg":  10 * 1024 * 1024,
  "audio/mpeg": 8 * 1024 * 1024,
  "audio/wav":  8 * 1024 * 1024,
  "audio/ogg":  8 * 1024 * 1024,
  "audio/webm": 8 * 1024 * 1024,
  "audio/mp4":  8 * 1024 * 1024,
  "application/pdf": 10 * 1024 * 1024,
  "application/msword": 10 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 10 * 1024 * 1024,
  "application/vnd.ms-excel": 10 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 10 * 1024 * 1024,
};

/**
 * Derive a FileType enum value from the MIME type.
 * Defaults to 'document' for unknown types that pass validation.
 */
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
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Sanitize filename to prevent directory traversal
  const sanitizedFilename = sanitizeFilename(file.name);
  if (!sanitizedFilename) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  // Determine allowed types and size limit based on declared MIME category
  let allowedTypes: string[];
  let maxSize: number;

  if (file.type.startsWith("video/")) {
    allowedTypes = ["video/mp4", "video/webm", "video/ogg"];
    maxSize = SIZE_LIMITS["video/mp4"];
  } else if (file.type.startsWith("image/")) {
    allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    maxSize = SIZE_LIMITS["image/jpeg"];
  } else if (file.type.startsWith("audio/")) {
    allowedTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"];
    maxSize = SIZE_LIMITS["audio/mpeg"];
  } else {
    allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    maxSize = SIZE_LIMITS["application/pdf"];
  }

  // Deep file validation (magic-number check + size)
  const validation = await validateFile(file, { allowedTypes, maxSize });
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error ?? "File validation failed" },
      { status: 400 }
    );
  }

  // Basic malware heuristic (blocks PHP, shell scripts, executables)
  const malwareCheck = await performBasicMalwareCheck(file);
  if (!malwareCheck.valid) {
    return NextResponse.json({ error: "File failed security check" }, { status: 400 });
  }

  const mimeType = validation.detectedType ?? file.type ?? "application/octet-stream";

  // Convert to base64 for DB storage
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  try {
    const stored = await db.file.create({
      data: {
        filename: sanitizedFilename,
        mimeType,
        size: file.size,
        data: base64,
        type: resolveFileType(mimeType),
        userId: session.user.id,
      },
      select: { id: true, filename: true, mimeType: true, size: true, type: true, createdAt: true },
    });

    return NextResponse.json({
      fileId: stored.id,
      // Canonical URL for serving this file back to the browser
      url: `/api/files/${stored.id}`,
      name: stored.filename,
      type: stored.mimeType,
      size: stored.size,
      category: stored.type,
      createdAt: stored.createdAt,
    });
  } catch (err) {
    console.error("[upload] DB write error:", err);
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
    console.error("[upload] Rate limiter error, falling back:", err);
    try {
      return await uploadHandler(req);
    } catch (handlerErr) {
      console.error("[upload] Handler error:", handlerErr);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }
}

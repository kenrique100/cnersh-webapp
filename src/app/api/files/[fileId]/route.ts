import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/files/[fileId]
 *
 * Serves a file stored as base64 in the database.
 * Streams the decoded bytes back with the correct Content-Type header
 * so browsers can display images/videos inline or download documents.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (!fileId) {
    return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
  }

  let file: { data: string; mimeType: string; filename: string } | null;
  try {
    file = await db.file.findUnique({
      where: { id: fileId },
      select: { data: true, mimeType: true, filename: true },
    });
  } catch (err) {
    console.error("[files] DB lookup error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Decode base64 → binary
  const buffer = Buffer.from(file.data, "base64");

  // Decide whether to inline (images/video/audio) or force-download (docs)
  const isInline = file.mimeType.startsWith("image/") ||
                   file.mimeType.startsWith("video/") ||
                   file.mimeType.startsWith("audio/");

  const disposition = isInline
    ? `inline; filename="${file.filename}"`
    : `attachment; filename="${file.filename}"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": disposition,
      // Cache for 1 day — files are immutable once uploaded
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

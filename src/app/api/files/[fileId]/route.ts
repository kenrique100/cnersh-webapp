import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (!fileId) {
    return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
  }

  let file: { data: string | null; url: string | null; mimeType: string; filename: string } | null;
  try {
    file = await db.file.findUnique({
      where: { id: fileId },
      select: { data: true, url: true, mimeType: true, filename: true },
    });
  } catch (err) {
    console.error("[files] DB lookup error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.url && !file.data) {
    return NextResponse.redirect(file.url, { status: 302 });
  }

  if (!file.data) {
    return NextResponse.json({ error: "File has no content" }, { status: 500 });
  }

  const buffer = Buffer.from(file.data, "base64");

  const isInline =
      file.mimeType.startsWith("image/") ||
      file.mimeType.startsWith("video/") ||
      file.mimeType.startsWith("audio/");

  const disposition = isInline
      ? `inline; filename="${file.filename}"`
      : `attachment; filename="${file.filename}"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":        file.mimeType,
      "Content-Length":      String(buffer.byteLength),
      "Content-Disposition": disposition,
      "Cache-Control":       "public, max-age=86400, immutable",
    },
  });
}
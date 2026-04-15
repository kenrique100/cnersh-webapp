import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authSession } from "@/lib/auth-utils";

/**
 * GET /api/files/[fileId]
 *
 * Retrieves a file stored in the database and streams it back to the browser.
 * - Sets the correct Content-Type so browsers render images/videos inline.
 * - Uses ETag-based caching so repeat requests are served from browser cache.
 * - Avatars are public (no auth required); other file types require a valid session.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  // Basic UUID format guard — prevents hitting the DB with obviously invalid IDs
  if (!fileId || !/^[0-9a-f-]{36}$/i.test(fileId)) {
    return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
  }

  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, filename: true, mimeType: true, size: true, data: true, type: true, userId: true, updatedAt: true },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Non-avatar files require authentication
  if (file.type !== "avatar") {
    const session = await authSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ETag from the file's updatedAt timestamp — enables 304 Not Modified responses
  const etag = `"${file.id}-${file.updatedAt.getTime()}"` as const;
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  // Decode base64 back to binary
  const buffer = Buffer.from(file.data, "base64");

  // Content-Disposition: inline lets browsers render images/video directly;
  // use attachment for documents so the browser downloads them.
  const isInline = file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/") || file.mimeType.startsWith("audio/");
  const disposition = isInline
    ? `inline; filename="${file.filename}"`
    : `attachment; filename="${file.filename}"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": disposition,
      // Cache publicly for 1 hour; must-revalidate ensures stale content is re-checked
      "Cache-Control": "public, max-age=3600, must-revalidate",
      ETag: etag,
    },
  });
}

/**
 * DELETE /api/files/[fileId]
 *
 * Deletes a file from the database. Only the file owner or an admin may delete.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  const session = await authSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!fileId || !/^[0-9a-f-]{36}$/i.test(fileId)) {
    return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
  }

  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { userId: true },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const isOwner = file.userId === session.user.id;
  const isAdmin = (session.user as { role?: string }).role === "admin";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.file.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}

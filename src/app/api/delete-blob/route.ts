import { NextRequest, NextResponse } from "next/server";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

/**
 * DELETE /api/delete-blob
 *
 * Previously deleted files from Vercel Blob storage.
 * Now proxies to the DB-backed file deletion endpoint for backwards compatibility.
 *
 * Accepts either:
 *   { url: "/api/files/<uuid>" }  — new format from upload route
 *   { fileId: "<uuid>" }          — explicit ID format
 *
 * Legacy Vercel Blob URLs are rejected with a clear error so callers can be
 * updated to use DELETE /api/files/[fileId] directly.
 */
export async function DELETE(req: NextRequest) {
  const session = await authSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string; fileId?: string };
  try {
    body = (await req.json()) as { url?: string; fileId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Resolve the file ID from either format
  let fileId: string | undefined;

  if (body.fileId) {
    fileId = body.fileId;
  } else if (body.url) {
    // Reject legacy Vercel Blob URLs
    if (body.url.includes("vercel-storage.com") || body.url.includes("blob.vercel")) {
      return NextResponse.json(
        { error: "Vercel Blob is no longer used. Files are stored in the database. Please use DELETE /api/files/<fileId> instead." },
        { status: 410 }
      );
    }
    // Extract UUID from /api/files/<uuid>
    const match = body.url.match(/\/api\/files\/([0-9a-f-]{36})/i);
    fileId = match?.[1];
  }

  if (!fileId || !/^[0-9a-f-]{36}$/i.test(fileId)) {
    return NextResponse.json({ error: "No valid file ID provided" }, { status: 400 });
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

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authSession } from "@/lib/auth-utils";
import { ErasedDataError, openFileData } from "@/lib/erasure/fields";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await authSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { fileId } = await params;

  if (!fileId) {
    return jsonError("Missing file ID", 400);
  }

  let file: {
    data: string | null;
    url: string | null;
    mimeType: string;
    filename: string;
    userId: string;
  } | null;
  try {
    file = await db.file.findUnique({
      where: { id: fileId },
      select: { data: true, url: true, mimeType: true, filename: true, userId: true },
    });
  } catch (err) {
    console.error("[files] DB lookup error:", err);
    return jsonError("Database error", 500);
  }

  const role = session.user.role;
  const isAdmin = role === "admin" || role === "superadmin";
  if (!file || (!isAdmin && file.userId !== session.user.id)) {
    return jsonError("File not found", 404);
  }

  if (file.url && !file.data) {
    const response = NextResponse.redirect(file.url, { status: 302 });
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
      response.headers.set(name, value);
    }
    return response;
  }

  if (!file.data) {
    return jsonError("File has no content", 500);
  }

  // Legacy inline content is sealed under the owner's per-user key. Once that
  // key has been destroyed the bytes are unreadable by design.
  let base64: string;
  try {
    base64 = await openFileData(file.data);
  } catch (err) {
    if (err instanceof ErasedDataError) return jsonError("File content has been erased", 410);
    console.error("[files] failed to open file content:", err);
    return jsonError("File content unavailable", 500);
  }
  const buffer = Buffer.from(base64, "base64");

  const isInline =
      file.mimeType.startsWith("image/") ||
      file.mimeType.startsWith("video/") ||
      file.mimeType.startsWith("audio/");

  const safeFilename = file.filename.replace(/["\\\r\n]/g, "_");
  const disposition = isInline
      ? `inline; filename="${safeFilename}"`
      : `attachment; filename="${safeFilename}"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":        file.mimeType,
      "Content-Length":      String(buffer.byteLength),
      "Content-Disposition": disposition,
      ...PRIVATE_HEADERS,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

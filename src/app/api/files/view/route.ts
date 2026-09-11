import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authSession } from "@/lib/auth-utils";

const PRIVATE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
};

function jsonError(error: string, status: number): NextResponse {
    return NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
}

export async function GET(request: NextRequest) {
    const session = await authSession();
    if (!session) return jsonError("Unauthorized", 401);

    const { searchParams } = request.nextUrl;

    const storageKey = searchParams.get("storageKey")?.trim();

    if (!storageKey) {
        return jsonError("Provide a storageKey query parameter (UploadThing file key)", 400);
    }

    let file: { url: string | null; userId: string } | null;
    try {
        file = await db.file.findUnique({
            where: { storageKey },
            select: { url: true, userId: true },
        });
    } catch (error) {
        console.error("[files/view] DB lookup error:", error);
        return jsonError("Database error", 500);
    }

    const role = session.user.role;
    const isAdmin = role === "admin" || role === "superadmin";
    if (!file?.url || (!isAdmin && file.userId !== session.user.id)) {
        return jsonError("File not found", 404);
    }

    const response = NextResponse.redirect(file.url, { status: 302 });
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
        response.headers.set(name, value);
    }
    return response;
}

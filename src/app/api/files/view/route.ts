import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifiedAuthSession } from "@/lib/auth-utils";
import { getSignedUrl } from "@/lib/uploadthing";

const PRIVATE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
};

// Short enough that a leaked signed URL is of limited use; long enough that
// large downloads complete on slow connections.
const SIGNED_URL_TTL_SECONDS = 180;

function jsonError(error: string, status: number): NextResponse {
    return NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
}

function redirectTo(url: string): NextResponse {
    const response = NextResponse.redirect(url, { status: 302 });
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
        response.headers.set(name, value);
    }
    return response;
}

export async function GET(request: NextRequest) {
    // 1. Auth
    let session;
    try {
        session = await verifiedAuthSession();
    } catch {
        return jsonError("Unauthorized", 401);
    }

    // 2. Parse query
    const { searchParams } = request.nextUrl;
    const storageKeyParam = searchParams.get("storageKey")?.trim() || null;
    const fileIdParam = searchParams.get("id")?.trim() || null;

    if (!storageKeyParam && !fileIdParam) {
        return jsonError(
            "Provide a storageKey or id query parameter",
            400,
        );
    }

    // 3. Look up
    let file: {
        url: string | null;
        storageKey: string | null;
        userId: string;
    } | null;
    try {
        file = storageKeyParam
            ? await db.file.findUnique({
                where: { storageKey: storageKeyParam },
                select: { url: true, storageKey: true, userId: true },
            })
            : await db.file.findUnique({
                where: { id: fileIdParam! },
                select: { url: true, storageKey: true, userId: true },
            });
    } catch (error) {
        console.error("[files/view] DB lookup error:", error);
        return jsonError("Database error", 500);
    }

    // 4. Ownership
    const role = session.user.role;
    const isAdmin = role === "admin" || role === "superadmin";
    if (!file || (!isAdmin && file.userId !== session.user.id)) {
        return jsonError("File not found", 404);
    }

    // 5. Private object — sign on demand
    if (file.storageKey) {
        const signed = await getSignedUrl(file.storageKey, SIGNED_URL_TTL_SECONDS);
        if (signed) {
            return redirectTo(signed);
        }
        // Signing failed. If this record has no legacy url, we cannot serve
        // it safely, so fail rather than expose an unsigned object.
        if (!file.url) {
            console.error(
                "[files/view] signing failed and no legacy url available for file",
            );
            return jsonError("File temporarily unavailable", 502);
        }
    }

    // 6. Legacy pre-migration file — public url from before ACL change
    if (file.url) {
        return redirectTo(file.url);
    }

    return jsonError("File not found", 404);
}
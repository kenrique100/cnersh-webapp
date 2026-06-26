import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;

    // Accept a storageKey (UploadThing file key) directly
    const storageKey = searchParams.get("storageKey")?.trim();

    if (!storageKey) {
        return NextResponse.json(
            { error: "Provide a storageKey query parameter (UploadThing file key)" },
            { status: 400 }
        );
    }

    // Look up the file in the database by its storageKey
    const file = await db.file.findUnique({
        where: { storageKey },
        select: { url: true },
    });

    if (!file?.url) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Redirect to the CDN URL (now UploadThing's ufsUrl)
    return NextResponse.redirect(file.url, { status: 302 });
}
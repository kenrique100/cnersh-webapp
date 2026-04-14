import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { authSession } from "@/lib/auth-utils";

const VERCEL_BLOB_HOSTNAME = "public.blob.vercel-storage.com";

export async function DELETE(req: NextRequest) {
    const session = await authSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { url } = await req.json() as { url?: string };

        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "No URL provided" }, { status: 400 });
        }

        // Only allow deletion of blobs hosted on Vercel Blob storage
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
        }

        if (!parsed.hostname.endsWith(VERCEL_BLOB_HOSTNAME)) {
            return NextResponse.json({ error: "URL is not a Vercel Blob URL" }, { status: 400 });
        }

        await del(url);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete blob error:", error);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { storageKeyFromUrl } from "@/lib/bunny-storage-client";

const MIME_MAP: Record<string, string> = {
    jpg:  "image/jpeg",
    jpeg: "image/jpeg",
    png:  "image/png",
    gif:  "image/gif",
    webp: "image/webp",
    mp4:  "video/mp4",
    webm: "video/webm",
    ogg:  "video/ogg",
    mp3:  "audio/mpeg",
    wav:  "audio/wav",
    pdf:  "application/pdf",
    doc:  "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls:  "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function guessMimeType(key: string): string {
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    return MIME_MAP[ext] ?? "application/octet-stream";
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;

    let storageKey = searchParams.get("storageKey");

    if (!storageKey) {
        const rawUrl = searchParams.get("url");
        if (rawUrl) {
            storageKey = storageKeyFromUrl(rawUrl);
        }
    }

    if (!storageKey) {
        return NextResponse.json(
            { error: "Provide a storageKey or url query parameter" },
            { status: 400 }
        );
    }

    const zone     = process.env.BUNNY_STORAGE_ZONE!;
    const password = process.env.BUNNY_STORAGE_PASSWORD!;
    const apiUrl   = process.env.BUNNY_STORAGE_API_URL!;

    if (!zone || !password || !apiUrl) {
        return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const endpoint = `https://${apiUrl}/${zone}/${storageKey}`;

    try {
        const upstream = await fetch(endpoint, {
            headers: { AccessKey: password },
        });

        if (!upstream.ok) {
            return new NextResponse("Not found", { status: 404 });
        }

        const contentType =
            upstream.headers.get("Content-Type") ?? guessMimeType(storageKey);

        return new NextResponse(upstream.body, {
            headers: {
                "Content-Type":           contentType,
                "X-Content-Type-Options": "nosniff",
                "Cache-Control":          "private, max-age=3600",
            },
        });
    } catch (err) {
        console.error("[files/view] BunnyCDN fetch failed:", err);
        return new NextResponse("Storage error", { status: 502 });
    }
}
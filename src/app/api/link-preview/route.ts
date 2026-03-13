import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; LinkPreview/1.0)",
                Accept: "text/html",
            },
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return NextResponse.json(
                { title: parsedUrl.hostname, description: "", image: "", domain: parsedUrl.hostname },
                { status: 200 }
            );
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
            return NextResponse.json(
                { title: parsedUrl.hostname, description: "", image: "", domain: parsedUrl.hostname },
                { status: 200 }
            );
        }

        // Read only the first 50KB to extract meta tags
        const reader = response.body?.getReader();
        let html = "";
        const decoder = new TextDecoder();
        const MAX_BYTES = 50 * 1024;
        let bytesRead = 0;

        if (reader) {
            while (bytesRead < MAX_BYTES) {
                const { done, value } = await reader.read();
                if (done) break;
                html += decoder.decode(value, { stream: true });
                bytesRead += value.length;
            }
            reader.cancel().catch(() => { /* stream cleanup */ });
        }

        const title = extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || extractTitle(html) || parsedUrl.hostname;
        const description = extractMeta(html, "og:description") || extractMeta(html, "twitter:description") || extractMetaName(html, "description") || "";
        let image = extractMeta(html, "og:image") || extractMeta(html, "twitter:image") || "";

        // Resolve relative image URLs
        if (image && !image.startsWith("http")) {
            try {
                image = new URL(image, url).href;
            } catch {
                image = "";
            }
        }

        const domain = parsedUrl.hostname.replace("www.", "");

        return NextResponse.json(
            { title: title.slice(0, 200), description: description.slice(0, 300), image, domain },
            {
                status: 200,
                headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
            }
        );
    } catch {
        return NextResponse.json(
            { title: parsedUrl.hostname, description: "", image: "", domain: parsedUrl.hostname },
            { status: 200 }
        );
    }
}

function extractMeta(html: string, property: string): string {
    const regex = new RegExp(
        `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
        "i"
    );
    const match = html.match(regex);
    return match?.[1] || match?.[2] || "";
}

function extractMetaName(html: string, name: string): string {
    const regex = new RegExp(
        `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`,
        "i"
    );
    const match = html.match(regex);
    return match?.[1] || match?.[2] || "";
}

function extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match?.[1]?.trim() || "";
}

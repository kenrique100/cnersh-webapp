import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { assertSafeUrl, fetchSafeUrl } from "@/lib/ssrf-guard";
import { parseHtmlMetadata } from "@/lib/extract-metadata";
import { getCachedPreview, setCachedPreview, type CachedPreview } from "@/lib/cache";
import { sanitizeText } from "@/lib/sanitize";

// SSRF guard needs node:dns / node:net - not available on the edge runtime.
export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_REDIRECTS = 5;
const MAX_BYTES = 100 * 1024; // 100KB - enough for meta tags even on bloated pages
const FETCH_TIMEOUT_MS = 6000;
const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function fallback(domain: string): CachedPreview {
    return {
        title: domain,
        description: "",
        image: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        domain,
    };
}

/**
 * Fetches a URL manually following redirects, re-validating each hop against
 * the SSRF guard (a redirect to an internal address is the classic bypass
 * for a naive "check the URL once" implementation).
 */
async function safeFetchHtml(startUrl: string): Promise<{ html: string; finalUrl: string } | null> {
    let currentUrl = startUrl;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const response = await fetchSafeUrl(currentUrl, {
            timeoutMs: FETCH_TIMEOUT_MS,
            maxBytes: MAX_BYTES,
            headers: {
                "User-Agent": USER_AGENT,
                Accept: "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get("location");
            if (!location) return null;
            currentUrl = new URL(location, currentUrl).href;
            continue; // loop re-validates the new URL against the SSRF guard
        }

        if (response.status < 200 || response.status >= 300) return null;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) return null;

        const html = new TextDecoder().decode(response.body);

        return { html, finalUrl: currentUrl };
    }

    return null; // too many redirects
}

async function handler(req: NextRequest): Promise<NextResponse> {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    const domain = parsedUrl.hostname.replace(/^www\./, "");

    // Reject before touching cache/network if it's not http(s) or resolves internally.
    try {
        await assertSafeUrl(url);
    } catch {
        return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    const cached = await getCachedPreview(url);
    if (cached) {
        return NextResponse.json(cached, {
            status: 200,
            headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400", "X-Cache": "HIT" },
        });
    }

    let result: CachedPreview;
    try {
        const fetched = await safeFetchHtml(url);
        if (!fetched) {
            result = fallback(domain);
        } else {
            const meta = parseHtmlMetadata(fetched.html, fetched.finalUrl);
            result = {
                title: sanitizeText(meta.title) || domain,
                description: sanitizeText(meta.description),
                image: meta.image || fallback(domain).image,
                domain,
            };
        }
    } catch {
        result = fallback(domain);
    }

    await setCachedPreview(url, result);

    return NextResponse.json(result, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400", "X-Cache": "MISS" },
    });
}

export const GET = withRateLimit(handler, RATE_LIMITS.linkPreview, { keyPrefix: "link-preview" });

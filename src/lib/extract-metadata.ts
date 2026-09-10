export interface ExtractedMetadata {
    title: string;
    description: string;
    image: string;
}

function decodeEntities(str: string): string {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractMeta(html: string, property: string): string {
    const regex = new RegExp(
        `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
        "i"
    );
    return html.match(regex)?.[1] || html.match(regex)?.[2] || "";
}

function extractMetaName(html: string, name: string): string {
    const regex = new RegExp(
        `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`,
        "i"
    );
    return html.match(regex)?.[1] || html.match(regex)?.[2] || "";
}

function extractLinkIcon(html: string, rel: string): string {
    const regex = new RegExp(
        `<link[^>]*rel=["']${rel}["'][^>]*href=["']([^"']*)["']|<link[^>]*href=["']([^"']*)["'][^>]*rel=["']${rel}["']`,
        "i"
    );
    return html.match(regex)?.[1] || html.match(regex)?.[2] || "";
}

function extractTitle(html: string): string {
    return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
}

function resolveUrl(raw: string, base: string): string {
    if (!raw) return "";
    try {
        if (raw.startsWith("//")) return `https:${raw}`;
        return new URL(raw, base).href;
    } catch {
        return "";
    }
}

/** Parses OG/Twitter meta tags out of a raw HTML string. Pure, testable. */
export function parseHtmlMetadata(html: string, baseUrl: string): ExtractedMetadata {
    const title = decodeEntities(
        extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || extractTitle(html)
    ).slice(0, 200);

    const description = decodeEntities(
        extractMeta(html, "og:description") ||
        extractMeta(html, "twitter:description") ||
        extractMetaName(html, "description")
    ).slice(0, 300);

    const rawImage =
        extractMeta(html, "og:image:secure_url") ||
        extractMeta(html, "og:image") ||
        extractMeta(html, "twitter:image") ||
        extractLinkIcon(html, "image_src");

    const image = resolveUrl(rawImage, baseUrl);

    return { title, description, image };
}
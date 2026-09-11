import sanitizeHtmlLib, { type IOptions } from "sanitize-html";

/**
 * HTML sanitisation runs on the server inside server actions and API routes.
 *
 * This used to go through isomorphic-dompurify, which on the server builds a
 * full jsdom window at import time. That crashed every Vercel function whose
 * bundle included this module (the home page through the feed actions,
 * /community, /api/link-preview, /api/sentry-feedback) before a single request
 * was handled. sanitize-html is a pure JavaScript allowlist sanitiser built on
 * htmlparser2, so it needs no DOM and loads anywhere Node runs. The allowlists
 * below reproduce the previous DOMPurify configuration.
 */

const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];

const RICH_TEXT_OPTIONS: IOptions = {
    allowedTags: [
        "p", "br", "strong", "em", "u",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li", "blockquote",
        "a", "code", "pre", "span",
    ],
    allowedAttributes: {
        "*": ["class"],
        a: ["href", "target", "rel", "class"],
    },
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
};

/**
 * Strips every tag but keeps their text, except for tags whose content is
 * code rather than prose (script, style, textarea, option), which is dropped
 * along with the tag. Text is serialised the way a DOM would serialise it:
 * `&`, `<` and `>` are entity encoded, quotes are left alone.
 */
const PLAIN_TEXT_OPTIONS: IOptions = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
};

export function sanitizeHtml(dirty: string): string {
    if (!dirty || typeof dirty !== "string") return "";
    return sanitizeHtmlLib(dirty, RICH_TEXT_OPTIONS);
}

export function sanitizeText(dirty: string): string {
    if (!dirty || typeof dirty !== "string") return "";
    return sanitizeHtmlLib(dirty, PLAIN_TEXT_OPTIONS);
}

export function escapeHtml(text: string): string {
    if (!text || typeof text !== "string") return "";
    const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "/": "&#x2F;",
    };
    return text.replace(/[&<>"'/]/g, (c) => map[c] ?? c);
}

export function sanitizeUrl(url: string): string {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (/^(javascript|data|vbscript|file|about|blob):/i.test(trimmed)) return "";
    if (trimmed.startsWith("//")) return "";
    try {
        if (/^[a-z][a-z0-9+.\-]*:/i.test(trimmed)) {
            const parsed = new URL(trimmed);
            if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) return "";
            return trimmed;
        }
        if (trimmed.startsWith("/")) return trimmed;
        return "";
    } catch {
        return "";
    }
}

export function sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    sanitizer: (value: string) => string = sanitizeText
): T {
    if (!obj || typeof obj !== "object") return obj;

    const result: Record<string, unknown> = Array.isArray(obj)
        ? ([] as unknown as Record<string, unknown>)
        : {};

    for (const key of Object.keys(obj)) {
        const value = (obj as Record<string, unknown>)[key];
        if (typeof value === "string") {
            result[key] = sanitizer(value);
        } else if (Array.isArray(value)) {
            result[key] = value.map((item) =>
                typeof item === "string"
                    ? sanitizer(item)
                    : item && typeof item === "object"
                        ? sanitizeObject(item as Record<string, unknown>, sanitizer)
                        : item
            );
        } else if (value && typeof value === "object") {
            result[key] = sanitizeObject(value as Record<string, unknown>, sanitizer);
        } else {
            result[key] = value;
        }
    }

    return result as T;
}
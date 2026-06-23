import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(dirty: string): string {
    if (!dirty || typeof dirty !== "string") return "";
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [
            "p", "br", "strong", "em", "u",
            "h1", "h2", "h3", "h4", "h5", "h6",
            "ul", "ol", "li", "blockquote",
            "a", "code", "pre", "span",
        ],
        ALLOWED_ATTR: ["href", "target", "rel", "class"],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        ALLOWED_URI_REGEXP:
            /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
}

export function sanitizeText(dirty: string): string {
    if (!dirty || typeof dirty !== "string") return "";
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    });
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
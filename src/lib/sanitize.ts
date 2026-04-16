import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes all potentially dangerous HTML/JavaScript while preserving safe formatting
 */
export function sanitizeHtml(dirty: string): string {
    if (!dirty || typeof dirty !== 'string') {
        return '';
    }

    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
}

/**
 * Sanitize plain text content (removes all HTML tags)
 * Use this for content that should not contain any HTML
 */
export function sanitizeText(dirty: string): string {
    if (!dirty || typeof dirty !== 'string') {
        return '';
    }

    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    });
}

/**
 * Sanitize user input for display
 * Escapes HTML entities and removes dangerous content
 */
export function escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
        return '';
    }

    // Remove any whitespace
    const trimmedUrl = url.trim();

    // Block dangerous protocols
    const dangerousProtocols = /^(javascript|data|vbscript|file|about):/i;
    if (dangerousProtocols.test(trimmedUrl)) {
        return '';
    }

    // Block protocol-relative URLs (e.g. //evil.com) — these adopt the page protocol
    if (trimmedUrl.startsWith('//')) {
        return '';
    }

    try {
        const parsed = new URL(trimmedUrl, 'https://placeholder.com');
        // Only allow http, https, mailto protocols
        if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
            return '';
        }
        return trimmedUrl;
    } catch {
        // If URL parsing fails, it's likely a relative URL or invalid
        // Only allow relative URLs that don't start with dangerous patterns
        if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//')) {
            return trimmedUrl;
        }
        return '';
    }
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
        return '';
    }

    // Remove path traversal attempts
    let safe = filename.replace(/\.\./g, '');

    // Remove any path separators
    safe = safe.replace(/[\/\\]/g, '');

    // Remove null bytes
    safe = safe.replace(/\0/g, '');

    // Remove control characters
    safe = safe.replace(/[\x00-\x1f\x80-\x9f]/g, '');

    // Limit to alphanumeric, dash, underscore, and dot
    safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Prevent double extensions that could be dangerous
    safe = safe.replace(/\.{2,}/g, '.');

    return safe;
}

/**
 * Sanitize object by applying sanitization to all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    sanitizer: (value: string) => string = sanitizeText
): T {
    const sanitized = { ...obj } as Record<string, unknown>;

    for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = sanitizer(sanitized[key] as string);
        } else if (Array.isArray(sanitized[key])) {
            sanitized[key] = (sanitized[key] as unknown[]).map((item: unknown) =>
                typeof item === 'string' ? sanitizer(item) : item
            );
        } else if (sanitized[key] && typeof sanitized[key] === 'object') {
            sanitized[key] = sanitizeObject(sanitized[key] as Record<string, unknown>, sanitizer);
        }
    }

    return sanitized as T;
}

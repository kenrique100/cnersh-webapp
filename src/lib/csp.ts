

const GOOGLE_TRANSLATE_DOMAINS = [
    "https://www.google.com",
    "https://translate.google.com",
    "https://translate.googleapis.com",
    "https://translate-pa.googleapis.com",
    "https://www.gstatic.com",
].join(" ");

const UPLOADTHING_DOMAINS = ["https://*.ufs.sh", "https://utfs.io"].join(" ");

export interface CspOptions {
    /** Per-request nonce. Omit only for responses that carry no document. */
    nonce?: string;
    /** Development builds need 'unsafe-eval' for React Refresh. */
    isDevelopment?: boolean;
}

export function buildContentSecurityPolicy({ nonce, isDevelopment = false }: CspOptions = {}): string {
    const scriptSrc = [
        "'self'",
        nonce ? `'nonce-${nonce}'` : null,
        "'strict-dynamic'",
        // React Refresh evaluates code at runtime; never enabled in production.
        isDevelopment ? "'unsafe-eval'" : null,
        // Development has no stable nonce for the dev overlay's inline scripts.
        isDevelopment && !nonce ? "'unsafe-inline'" : null,
        GOOGLE_TRANSLATE_DOMAINS,
    ]
        .filter(Boolean)
        .join(" ");

    return [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        // Inline styles remain permitted: Next.js and the styling layer emit
        // inline style attributes that cannot carry a nonce.
        `style-src 'self' 'unsafe-inline' ${GOOGLE_TRANSLATE_DOMAINS}`,
        `img-src 'self' data: blob: https://lh3.googleusercontent.com https://fonts.gstatic.com https://static.licdn.com ${UPLOADTHING_DOMAINS} ${GOOGLE_TRANSLATE_DOMAINS}`,
        `font-src 'self' data: https://fonts.gstatic.com ${GOOGLE_TRANSLATE_DOMAINS}`,
        `connect-src 'self' https://api.resend.com ${UPLOADTHING_DOMAINS} ${GOOGLE_TRANSLATE_DOMAINS} https://*.sentry.io https://sentry.io`,
        `media-src 'self' data: blob: ${UPLOADTHING_DOMAINS}`,
        `worker-src 'self' blob: ${GOOGLE_TRANSLATE_DOMAINS}`,
        `frame-src 'self' ${GOOGLE_TRANSLATE_DOMAINS}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
    ].join("; ");
}

/** Cryptographically random, base64-encoded nonce for one response. */
export function createCspNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes));
}

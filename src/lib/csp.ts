const GOOGLE_TRANSLATE_DOMAINS = [
    "https://www.google.com",
    "https://translate.google.com",
    "https://translate.googleapis.com",
    "https://translate-pa.googleapis.com",
    "https://www.gstatic.com",
].join(" ");

const UPLOADTHING_DOMAINS = ["https://*.ufs.sh", "https://utfs.io"].join(" ");

export interface CspOptions {
    nonce?: string;
    /** Development builds need 'unsafe-eval' for React Refresh. */
    isDevelopment?: boolean;
}

export function buildContentSecurityPolicy({
                                               nonce,
                                               isDevelopment = false,
                                           }: CspOptions = {}): string {
    const scriptSrc = nonce
        ? [
            "'self'",
            `'nonce-${nonce}'`,
            "'strict-dynamic'",
            // React Refresh evaluates code at runtime; never enabled in prod.
            isDevelopment ? "'unsafe-eval'" : null,
            GOOGLE_TRANSLATE_DOMAINS,
        ]
            .filter(Boolean)
            .join(" ")
        : [
            "'self'",
            "'unsafe-inline'",
            isDevelopment ? "'unsafe-eval'" : null,
            GOOGLE_TRANSLATE_DOMAINS,
        ]
            .filter(Boolean)
            .join(" ");

    return [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
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
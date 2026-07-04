export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

export const RATE_LIMITS = Object.freeze({
    auth: Object.freeze({
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
    }),
    api: Object.freeze({
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
    }),
    trending: Object.freeze({
        windowMs: 60 * 1000,
        maxRequests: 60,
    }),
    fileUpload: Object.freeze({
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
    }),
    reportSubmission: Object.freeze({
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
    }),
    formSubmission: Object.freeze({
        windowMs: 60 * 60 * 1000,
        maxRequests: 20,
    }),
    linkPreview: Object.freeze({
        windowMs: 60 * 1000,
        maxRequests: 20,
    }),
});
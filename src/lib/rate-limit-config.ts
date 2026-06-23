export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

export const RATE_LIMITS = {
    auth: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
    },
    api: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
    },
    trending: {
        windowMs: 60 * 1000,
        maxRequests: 60,
    },
    fileUpload: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
    },
    reportSubmission: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
    },
    formSubmission: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 20,
    },
} as const;
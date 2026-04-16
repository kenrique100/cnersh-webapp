/**
 * Rate limiting configuration — zero external dependencies so this file
 * can be imported safely in any environment including Jest tests.
 */

export interface RateLimitConfig {
    windowMs: number;    // Time window in milliseconds
    maxRequests: number; // Maximum requests allowed in window
}

/**
 * Predefined rate limit tiers
 */
export const RATE_LIMITS = {
    // Authentication endpoints: 5 requests per 15 minutes
    auth: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
    },
    // API endpoints: 100 requests per 15 minutes per user
    api: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
    },
    // File uploads: 10 uploads per hour per user
    fileUpload: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
    },
    // Report submissions: 5 reports per hour per user
    reportSubmission: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
    },
    // Form submissions: 20 submissions per hour
    formSubmission: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 20,
    },
} as const;

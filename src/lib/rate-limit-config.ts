export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

export const RATE_LIMITS = Object.freeze({
    auth: Object.freeze({
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
    }),
    authSignIn: Object.freeze({
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
    }),
    authSignUp: Object.freeze({
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
    }),
    api: Object.freeze({
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
    }),
    postCreate: Object.freeze({
        windowMs: 60 * 1000,
        maxRequests: 8,
    }),
    commentCreate: Object.freeze({
        windowMs: 60 * 1000,
        maxRequests: 20,
    }),
    likeToggle: Object.freeze({
        windowMs: 60 * 1000,
        maxRequests: 80,
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
    accountDeletion: Object.freeze({
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
    }),
});
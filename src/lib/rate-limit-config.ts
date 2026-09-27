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
    // Password reset request. Tight because it triggers an outbound email
    // and can be abused to spam a third party using our sending domain.
    passwordReset: Object.freeze({
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
    }),
    // Verification email resend. Same reasoning as passwordReset; slightly
    // relaxed because legitimate users often request it more than once.
    verifyEmailResend: Object.freeze({
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
        windowMs: 15 * 60 * 1000,
        maxRequests: 50,
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
    // Public protocol tracker (anonymous). Bucketed by tracking-code hash,
    // so a single code cannot be polled aggressively regardless of source IP.
    protocolTrack: Object.freeze({
        windowMs: 60 * 1000,
        maxRequests: 10,
    }),
});
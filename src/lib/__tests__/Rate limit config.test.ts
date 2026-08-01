import { RATE_LIMITS } from '../rate-limit-config';

describe('RATE_LIMITS values', () => {
    it('auth: 5 requests per 15 minutes', () => {
        expect(RATE_LIMITS.auth.maxRequests).toBe(5);
        expect(RATE_LIMITS.auth.windowMs).toBe(15 * 60 * 1000);
    });

    it('authSignIn: 10 requests per 15 minutes', () => {
        expect(RATE_LIMITS.authSignIn.maxRequests).toBe(10);
        expect(RATE_LIMITS.authSignIn.windowMs).toBe(15 * 60 * 1000);
    });

    it('authSignUp: 5 requests per 1 hour', () => {
        expect(RATE_LIMITS.authSignUp.maxRequests).toBe(5);
        expect(RATE_LIMITS.authSignUp.windowMs).toBe(60 * 60 * 1000);
    });

    it('content limits are configured', () => {
        expect(RATE_LIMITS.postCreate.maxRequests).toBe(8);
        expect(RATE_LIMITS.commentCreate.maxRequests).toBe(20);
        expect(RATE_LIMITS.likeToggle.maxRequests).toBe(80);
    });
});

describe('RATE_LIMITS relationships', () => {
    it('auth is stricter than api', () => {
        expect(RATE_LIMITS.auth.maxRequests).toBeLessThan(RATE_LIMITS.api.maxRequests);
    });

    it('authSignUp is stricter than authSignIn', () => {
        expect(RATE_LIMITS.authSignUp.maxRequests).toBeLessThan(RATE_LIMITS.authSignIn.maxRequests);
    });

    it('all configs have windowMs and maxRequests', () => {
        for (const [, config] of Object.entries(RATE_LIMITS)) {
            expect(typeof config.windowMs).toBe('number');
            expect(typeof config.maxRequests).toBe('number');
            expect(config.windowMs).toBeGreaterThan(0);
            expect(config.maxRequests).toBeGreaterThan(0);
        }
    });
});

describe('RATE_LIMITS immutability', () => {
    it('should not allow mutation in strict mode', () => {
        const original = RATE_LIMITS.auth.maxRequests;
        try {
            (RATE_LIMITS.auth as Record<string, unknown>).maxRequests = 999;
        } catch {
            // Expected in strict mode — Object.freeze throws in strict
        }
        expect(RATE_LIMITS.auth.maxRequests).toBe(original);
    });

    it('top-level object is frozen', () => {
        expect(Object.isFrozen(RATE_LIMITS)).toBe(true);
    });

    it('nested config objects are frozen', () => {
        for (const [, config] of Object.entries(RATE_LIMITS)) {
            expect(Object.isFrozen(config)).toBe(true);
        }
    });
});

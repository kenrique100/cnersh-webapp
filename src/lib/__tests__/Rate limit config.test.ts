import { RATE_LIMITS } from '../rate-limit-config';

describe('RATE_LIMITS values', () => {
    it('auth: 5 requests per 15 minutes', () => {
        expect(RATE_LIMITS.auth.maxRequests).toBe(5);
        expect(RATE_LIMITS.auth.windowMs).toBe(15 * 60 * 1000);
    });

    it('api: 100 requests per 15 minutes', () => {
        expect(RATE_LIMITS.api.maxRequests).toBe(100);
        expect(RATE_LIMITS.api.windowMs).toBe(15 * 60 * 1000);
    });

    it('fileUpload: 10 requests per 1 hour', () => {
        expect(RATE_LIMITS.fileUpload.maxRequests).toBe(10);
        expect(RATE_LIMITS.fileUpload.windowMs).toBe(60 * 60 * 1000);
    });

    it('reportSubmission: 5 requests per 1 hour', () => {
        expect(RATE_LIMITS.reportSubmission.maxRequests).toBe(5);
        expect(RATE_LIMITS.reportSubmission.windowMs).toBe(60 * 60 * 1000);
    });

    it('trending: 60 requests per 1 minute', () => {
        expect(RATE_LIMITS.trending.maxRequests).toBe(60);
        expect(RATE_LIMITS.trending.windowMs).toBe(60 * 1000);
    });

    it('formSubmission: 20 requests per 1 hour', () => {
        expect(RATE_LIMITS.formSubmission.maxRequests).toBe(20);
        expect(RATE_LIMITS.formSubmission.windowMs).toBe(60 * 60 * 1000);
    });
});

describe('RATE_LIMITS relationships', () => {
    it('auth is stricter than api', () => {
        expect(RATE_LIMITS.auth.maxRequests).toBeLessThan(RATE_LIMITS.api.maxRequests);
    });

    it('auth window is 900000ms (15 min)', () => {
        expect(RATE_LIMITS.auth.windowMs).toBe(900_000);
    });

    it('fileUpload window is 3600000ms (1 hour)', () => {
        expect(RATE_LIMITS.fileUpload.windowMs).toBe(3_600_000);
    });

    it('trending is more permissive than auth', () => {
        expect(RATE_LIMITS.trending.maxRequests).toBeGreaterThan(RATE_LIMITS.auth.maxRequests);
    });

    it('all configs have windowMs and maxRequests', () => {
        for (const [, config] of Object.entries(RATE_LIMITS)) {
            expect(typeof config.windowMs).toBe('number');
            expect(typeof config.maxRequests).toBe('number');
            expect(config.windowMs).toBeGreaterThan(0);
            expect(config.maxRequests).toBeGreaterThan(0);
        }
    });

    it('reportSubmission is stricter than formSubmission', () => {
        expect(RATE_LIMITS.reportSubmission.maxRequests).toBeLessThan(RATE_LIMITS.formSubmission.maxRequests);
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
        expect(Object.isFrozen(RATE_LIMITS.auth)).toBe(true);
        expect(Object.isFrozen(RATE_LIMITS.api)).toBe(true);
        expect(Object.isFrozen(RATE_LIMITS.fileUpload)).toBe(true);
        expect(Object.isFrozen(RATE_LIMITS.reportSubmission)).toBe(true);
        expect(Object.isFrozen(RATE_LIMITS.trending)).toBe(true);
        expect(Object.isFrozen(RATE_LIMITS.formSubmission)).toBe(true);
    });

    it('cannot add new properties to nested objects', () => {
        const original = Object.keys(RATE_LIMITS.auth).length;
        try {
            (RATE_LIMITS.auth as Record<string, unknown>).newProp = 'value';
        } catch {
            // Expected
        }
        expect(Object.keys(RATE_LIMITS.auth).length).toBe(original);
    });
});
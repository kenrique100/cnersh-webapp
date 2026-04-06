import { RATE_LIMITS } from '../rate-limit';

describe('RATE_LIMITS', () => {
    it('should have correct auth rate limits', () => {
        expect(RATE_LIMITS.auth.maxRequests).toBe(5);
        expect(RATE_LIMITS.auth.windowMs).toBe(15 * 60 * 1000);
    });

    it('should have correct API rate limits', () => {
        expect(RATE_LIMITS.api.maxRequests).toBe(100);
        expect(RATE_LIMITS.api.windowMs).toBe(15 * 60 * 1000);
    });

    it('should have correct file upload rate limits', () => {
        expect(RATE_LIMITS.fileUpload.maxRequests).toBe(10);
        expect(RATE_LIMITS.fileUpload.windowMs).toBe(60 * 60 * 1000);
    });

    it('should have correct report submission rate limits', () => {
        expect(RATE_LIMITS.reportSubmission.maxRequests).toBe(5);
        expect(RATE_LIMITS.reportSubmission.windowMs).toBe(60 * 60 * 1000);
    });
});

describe('Rate Limiting Configuration', () => {
    it('should enforce stricter limits on authentication than API', () => {
        expect(RATE_LIMITS.auth.maxRequests).toBeLessThan(RATE_LIMITS.api.maxRequests);
    });

    it('should have appropriate time windows', () => {
        // Auth should be 15 minutes
        expect(RATE_LIMITS.auth.windowMs).toBe(900000);

        // File uploads should be 1 hour
        expect(RATE_LIMITS.fileUpload.windowMs).toBe(3600000);
    });
});

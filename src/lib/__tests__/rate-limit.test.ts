import { RATE_LIMITS } from "@/lib/rate-limit-config";

describe("RATE_LIMITS values", () => {
    it("auth: 5 requests per 15 minutes", () => {
        expect(RATE_LIMITS.auth.maxRequests).toBe(5);
        expect(RATE_LIMITS.auth.windowMs).toBe(15 * 60 * 1000);
    });

    it("api: 100 requests per 15 minutes", () => {
        expect(RATE_LIMITS.api.maxRequests).toBe(100);
        expect(RATE_LIMITS.api.windowMs).toBe(15 * 60 * 1000);
    });

    it("fileUpload: 10 requests per 1 hour", () => {
        expect(RATE_LIMITS.fileUpload.maxRequests).toBe(10);
        expect(RATE_LIMITS.fileUpload.windowMs).toBe(60 * 60 * 1000);
    });

    it("reportSubmission: 5 requests per 1 hour", () => {
        expect(RATE_LIMITS.reportSubmission.maxRequests).toBe(5);
        expect(RATE_LIMITS.reportSubmission.windowMs).toBe(60 * 60 * 1000);
    });
});

describe("RATE_LIMITS relationships", () => {
    it("auth is stricter than api", () => {
        expect(RATE_LIMITS.auth.maxRequests).toBeLessThan(RATE_LIMITS.api.maxRequests);
    });

    it("auth window is 900000ms (15 min)", () => {
        expect(RATE_LIMITS.auth.windowMs).toBe(900_000);
    });

    it("fileUpload window is 3600000ms (1 hour)", () => {
        expect(RATE_LIMITS.fileUpload.windowMs).toBe(3_600_000);
    });

    it("authSignUp is stricter than authSignIn", () => {
        expect(RATE_LIMITS.authSignUp.maxRequests).toBeLessThan(RATE_LIMITS.authSignIn.maxRequests);
    });

    it("all configs have windowMs and maxRequests", () => {
        for (const [, config] of Object.entries(RATE_LIMITS)) {
            expect(typeof config.windowMs).toBe("number");
            expect(typeof config.maxRequests).toBe("number");
            expect(config.windowMs).toBeGreaterThan(0);
            expect(config.maxRequests).toBeGreaterThan(0);
        }
    });
});

describe("RATE_LIMITS immutability", () => {
    it("should not allow mutation in strict mode", () => {
        const original = RATE_LIMITS.auth.maxRequests;
        // Object.freeze causes assignment to throw in strict mode
        expect(() => {
            (RATE_LIMITS.auth as Record<string, unknown>).maxRequests = 999;
        }).toThrow();
        expect(RATE_LIMITS.auth.maxRequests).toBe(original);
    });
});
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import type { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { rateLimit } from "@/lib/rate-limit";

jest.mock("@/lib/redis", () => ({
    redis: {
        slidingWindow: jest.fn(),
    },
}));

const mockedRedis = jest.mocked(redis);

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

describe("rateLimit", () => {
    const request = {
        headers: new Headers({ "x-forwarded-for": "203.0.113.10" }),
    } as NextRequest;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("uses the atomic Redis sliding-window operation", async () => {
        mockedRedis.slidingWindow.mockResolvedValueOnce({
            allowed: true,
            count: 1,
            resetTime: Date.now() + 60_000,
        });

        await expect(
            rateLimit(request, { windowMs: 60_000, maxRequests: 2 }, "test")
        ).resolves.toBeNull();
        expect(mockedRedis.slidingWindow).toHaveBeenCalledWith(
            "rl:test:ip:203.0.113.10",
            expect.any(Number),
            60_000,
            2,
            expect.any(String),
        );
    });

    it("fails closed with 503 when the shared limiter is unavailable", async () => {
        mockedRedis.slidingWindow.mockRejectedValueOnce(new Error("redis down"));
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

        const response = await rateLimit(
            request,
            { windowMs: 60_000, maxRequests: 2 },
            "test",
        );

        expect(response?.status).toBe(503);
        expect(response?.headers.get("Retry-After")).toBe("5");
        consoleError.mockRestore();
    });
});

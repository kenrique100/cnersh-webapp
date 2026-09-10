import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { RateLimitConfig, RATE_LIMITS } from "@/lib/rate-limit-config";

export type { RateLimitConfig };
export { RATE_LIMITS };

function getIdentifier(req: NextRequest, userId?: string): string {
    if (userId) return `user:${userId}`;
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";
    return `ip:${ip}`;
}

async function slidingWindowCheck(
    key: string,
    config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const member = `${now}-${Math.random().toString(36).slice(2, 9)}`;

    const result = await redis.slidingWindow(
        key,
        now,
        config.windowMs,
        config.maxRequests,
        member
    );

    return {
        allowed: result.allowed,
        remaining: Math.max(0, config.maxRequests - result.count),
        resetTime: result.resetTime,
    };
}

export async function rateLimit(
    req: NextRequest,
    config: RateLimitConfig,
    keyPrefix: string,
    userId?: string
): Promise<NextResponse | null> {
    const identifier = getIdentifier(req, userId);
    const key = `rl:${keyPrefix}:${identifier}`;
    let result: Awaited<ReturnType<typeof slidingWindowCheck>>;
    try {
        result = await slidingWindowCheck(key, config);
    } catch (error) {
        console.error("[rate-limit] shared store unavailable:", error);
        return NextResponse.json(
            { error: "Service Unavailable", message: "Rate limiting is temporarily unavailable." },
            {
                status: 503,
                headers: { "Retry-After": "5", "Cache-Control": "private, no-store" },
            }
        );
    }

    const headers = new Headers();
    headers.set("X-RateLimit-Limit", config.maxRequests.toString());
    headers.set("X-RateLimit-Remaining", result.remaining.toString());
    headers.set("X-RateLimit-Reset", new Date(result.resetTime).toISOString());

    if (!result.allowed) {
        const retryAfter = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
        headers.set("Retry-After", retryAfter.toString());
        return NextResponse.json(
            { error: "Too Many Requests", message: `Retry in ${retryAfter}s.` },
            { status: 429, headers }
        );
    }

    return null;
}

export function withRateLimit(
    handler: (req: NextRequest) => Promise<NextResponse>,
    config: RateLimitConfig = RATE_LIMITS.api,
    options: {
        keyPrefix?: string;
        getUserId?: (req: NextRequest) => Promise<string | undefined>;
    } = {}
) {
    return async (req: NextRequest): Promise<NextResponse> => {
        let userId: string | undefined;
        try {
            userId = options.getUserId ? await options.getUserId(req) : undefined;
        } catch (error) {
            console.error("[rate-limit] failed to resolve request identity:", error);
            return NextResponse.json(
                { error: "Service Unavailable" },
                { status: 503, headers: { "Cache-Control": "private, no-store" } }
            );
        }
        const keyPrefix = options.keyPrefix ?? "api";
        const limited = await rateLimit(req, config, keyPrefix, userId);
        if (limited) return limited;
        return handler(req);
    };
}

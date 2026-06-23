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
    const windowStart = now - config.windowMs;
    const windowSec = Math.ceil(config.windowMs / 1000);
    const member = `${now}-${Math.random().toString(36).slice(2, 9)}`;

    try {
        const pipe = redis.pipeline();
        pipe.zremrangebyscore(key, 0, windowStart);
        pipe.zcard(key);
        pipe.zadd(key, now, member);
        pipe.expire(key, windowSec + 1);
        const results = await pipe.exec();
        const countBeforeAdd = (results?.[1]?.[1] as number) ?? 0;
        const currentCount = countBeforeAdd + 1;
        const allowed = currentCount <= config.maxRequests;

        return {
            allowed,
            remaining: Math.max(0, config.maxRequests - currentCount),
            resetTime: now + config.windowMs,
        };
    } catch {
        return { allowed: true, remaining: config.maxRequests, resetTime: now + config.windowMs };
    }
}

export async function rateLimit(
    req: NextRequest,
    config: RateLimitConfig,
    keyPrefix: string,
    userId?: string
): Promise<NextResponse | null> {
    const identifier = getIdentifier(req, userId);
    const key = `rl:${keyPrefix}:${identifier}`;
    const result = await slidingWindowCheck(key, config);

    const headers = new Headers();
    headers.set("X-RateLimit-Limit", config.maxRequests.toString());
    headers.set("X-RateLimit-Remaining", result.remaining.toString());
    headers.set("X-RateLimit-Reset", new Date(result.resetTime).toISOString());

    if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
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
        const userId = options.getUserId ? await options.getUserId(req) : undefined;
        const keyPrefix = options.keyPrefix ?? "api";
        const limited = await rateLimit(req, config, keyPrefix, userId);
        if (limited) return limited;
        return handler(req);
    };
}
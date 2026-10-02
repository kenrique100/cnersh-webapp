import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { RateLimitConfig, RATE_LIMITS } from "@/lib/rate-limit-config";

export type { RateLimitConfig };
export { RATE_LIMITS };

type TrustMode = "vercel" | "cloudflare" | "forwarded" | "none";

const TRUST_MODE: TrustMode = (() => {
    const raw = (process.env.TRUSTED_PROXY_MODE ?? "").trim().toLowerCase();
    if (raw === "vercel" || raw === "cloudflare" || raw === "forwarded" || raw === "none") {
        return raw;
    }
    if (raw) {
        console.error(
            `[rate-limit] unknown TRUSTED_PROXY_MODE "${raw}"; falling back to auto-detect`
        );
    }
    if (process.env.VERCEL) return "vercel";
    return "forwarded";
})();

// The longest plausible header value we will accept. Anything beyond this is
// truncated before being used in a Redis key, so a client cannot force huge
// keys or hash-bucket collisions by sending a megabyte of XFF.
const MAX_IP_LENGTH = 128;

/** Strip brackets, trim, and cap length. Never throws on malformed input. */
function sanitizeIpCandidate(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.split(",")[0]!.trim().replace(/^\[|\]$/g, "");
    if (!trimmed) return null;
    return trimmed.slice(0, MAX_IP_LENGTH);
}

function getClientIp(req: NextRequest): string | null {
    switch (TRUST_MODE) {
        case "vercel":
            // Vercel strips and rewrites this header; x-real-ip is a fallback
            // that Vercel also sets authoritatively.
            return (
                sanitizeIpCandidate(req.headers.get("x-vercel-forwarded-for")) ??
                sanitizeIpCandidate(req.headers.get("x-real-ip"))
            );
        case "cloudflare":
            return sanitizeIpCandidate(req.headers.get("cf-connecting-ip"));
        case "forwarded":
            return (
                sanitizeIpCandidate(req.headers.get("x-forwarded-for")) ??
                sanitizeIpCandidate(req.headers.get("x-real-ip"))
            );
        case "none":
        default:
            return null;
    }
}

function getIdentifier(req: NextRequest, userId?: string): string {
    if (userId) return `user:${userId}`;
    const ip = getClientIp(req);
    return `ip:${ip ?? "unknown"}`;
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
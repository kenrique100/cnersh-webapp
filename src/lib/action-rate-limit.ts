import { redis } from "@/lib/redis";
import type { RateLimitConfig } from "@/lib/rate-limit-config";

async function checkActionRateLimit(
    key: string,
    config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const now = Date.now();
    const member = `${now}-${Math.random().toString(36).slice(2, 9)}`;

    try {
        const result = await redis.slidingWindow(
            key,
            now,
            config.windowMs,
            config.maxRequests,
            member
        );

        if (result.allowed) {
            return { allowed: true, retryAfterSeconds: 0 };
        }

        return {
            allowed: false,
            retryAfterSeconds: Math.max(
                1,
                Math.ceil((result.resetTime - Date.now()) / 1000)
            ),
        };
    } catch (error) {
        console.error("[action-rate-limit] shared store unavailable:", error);
        throw new Error("Rate limiting is temporarily unavailable. Please try again.");
    }
}

export async function enforceActionRateLimit(
    identifier: string,
    config: RateLimitConfig,
    keyPrefix: string,
    message: string
): Promise<void> {
    const key = `rl-action:${keyPrefix}:${identifier}`;
    const result = await checkActionRateLimit(key, config);
    if (!result.allowed) {
        throw new Error(`${message} Please try again in ${result.retryAfterSeconds} seconds.`);
    }
}

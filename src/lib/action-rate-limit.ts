import { redis } from "@/lib/redis";
import type { RateLimitConfig } from "@/lib/rate-limit-config";

async function checkActionRateLimit(
    key: string,
    config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const windowSec = Math.ceil(config.windowMs / 1000);
    const member = `${now}-${Math.random().toString(36).slice(2, 9)}`;

    try {
        const pipeline = redis.pipeline();
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zcard(key);
        pipeline.zadd(key, now, member);
        pipeline.expire(key, windowSec + 1);
        const results = await pipeline.exec();
        const countBeforeAdd = (results?.[1]?.[1] as number) ?? 0;
        const currentCount = countBeforeAdd + 1;
        const allowed = currentCount <= config.maxRequests;

        if (allowed) {
            return { allowed: true, retryAfterSeconds: 0 };
        }

        return { allowed: false, retryAfterSeconds: windowSec };
    } catch {
        return { allowed: true, retryAfterSeconds: 0 };
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

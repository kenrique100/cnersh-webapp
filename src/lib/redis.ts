import Redis from "ioredis";

type StoreEntry = { value: string; expiry: number };
export type SlidingWindowResult = {
    allowed: boolean;
    count: number;
    resetTime: number;
};

declare global {
    var __redis: Redis | undefined;
    var __redis_mem: Map<string, StoreEntry> | undefined;
    var __redis_zsets: Map<string, Map<string, number>> | undefined;
    var __redis_zset_expiry: Map<string, number> | undefined;
}

type PipelineResult = [null, unknown][];

interface MemoryPipeline {
    zremrangebyscore(key: string, min: number, max: number): void;
    zcard(key: string): void;
    zadd(key: string, score: number, member: string): void;
    expire(key: string, seconds: number): void;
    exec(): Promise<PipelineResult>;
}

interface UnifiedClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, ttl?: number): Promise<string>;
    del(key: string): Promise<number>;
    setnx(key: string, value: string): Promise<number>;
    compareAndDelete(key: string, expectedValue: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    slidingWindow(
        key: string,
        now: number,
        windowMs: number,
        maxRequests: number,
        member: string
    ): Promise<SlidingWindowResult>;
    pipeline(): MemoryPipeline;
}

function buildMemoryClient(): UnifiedClient {
    if (!globalThis.__redis_mem) globalThis.__redis_mem = new Map();
    if (!globalThis.__redis_zsets) globalThis.__redis_zsets = new Map();
    if (!globalThis.__redis_zset_expiry) globalThis.__redis_zset_expiry = new Map();

    const mem = globalThis.__redis_mem!;
    const zsets = globalThis.__redis_zsets!;
    const zsetExpiry = globalThis.__redis_zset_expiry!;

    setInterval(() => {
        const now = Date.now();
        for (const [k, v] of mem.entries()) {
            if (v.expiry > 0 && v.expiry < now) mem.delete(k);
        }
        for (const [k, expiry] of zsetExpiry.entries()) {
            if (expiry > 0 && expiry < now) {
                zsets.delete(k);
                zsetExpiry.delete(k);
            }
        }
    }, 60_000).unref();

    function alive(key: string): boolean {
        const e = mem.get(key);
        if (!e) return false;
        if (e.expiry > 0 && e.expiry < Date.now()) {
            mem.delete(key);
            return false;
        }
        return true;
    }

    function liveZSet(key: string): Map<string, number> | undefined {
        const expiry = zsetExpiry.get(key);
        if (expiry && expiry < Date.now()) {
            zsets.delete(key);
            zsetExpiry.delete(key);
            return undefined;
        }
        return zsets.get(key);
    }

    return {
        async get(key) {
            return alive(key) ? mem.get(key)!.value : null;
        },
        async set(key, value, mode?, ttl?) {
            if (mode === "NX" && alive(key)) return "nil";
            const expiry = ttl ? Date.now() + ttl * 1000 : 0;
            mem.set(key, { value, expiry });
            return "OK";
        },
        async del(key) {
            return mem.delete(key) ? 1 : 0;
        },
        async setnx(key, value) {
            if (alive(key)) return 0;
            mem.set(key, { value, expiry: 0 });
            return 1;
        },
        async compareAndDelete(key, expectedValue) {
            if (!alive(key) || mem.get(key)?.value !== expectedValue) return 0;
            mem.delete(key);
            return 1;
        },
        async expire(key, seconds) {
            const e = mem.get(key);
            if (e) {
                e.expiry = Date.now() + seconds * 1000;
                return 1;
            }
            if (liveZSet(key)) {
                zsetExpiry.set(key, Date.now() + seconds * 1000);
                return 1;
            }
            return 0;
        },
        async slidingWindow(key, now, windowMs, maxRequests, member) {
            const windowStart = now - windowMs;
            let zset = liveZSet(key);
            if (!zset) {
                zset = new Map();
                zsets.set(key, zset);
            }

            for (const [existingMember, score] of zset) {
                if (score <= windowStart) zset.delete(existingMember);
            }

            const allowed = zset.size < maxRequests;
            if (allowed) zset.set(member, now);
            zsetExpiry.set(key, now + windowMs + 1_000);

            let oldest = now;
            for (const score of zset.values()) {
                if (score < oldest) oldest = score;
            }

            return {
                allowed,
                count: zset.size,
                resetTime: oldest + windowMs,
            };
        },
        pipeline(): MemoryPipeline {
            const ops: Array<() => [null, unknown]> = [];
            return {
                zremrangebyscore(key, min, max) {
                    ops.push(() => {
                        const z = liveZSet(key);
                        if (z) {
                            for (const [m, s] of z) {
                                if (s >= min && s <= max) z.delete(m);
                            }
                        }
                        return [null, 0];
                    });
                },
                zcard(key) {
                    ops.push(() => [null, liveZSet(key)?.size ?? 0]);
                },
                zadd(key, score, member) {
                    ops.push(() => {
                        if (!zsets.has(key)) zsets.set(key, new Map());
                        zsets.get(key)!.set(member, score);
                        return [null, 1];
                    });
                },
                expire(key, seconds) {
                    ops.push(() => {
                        const z = liveZSet(key);
                        if (z) zsetExpiry.set(key, Date.now() + seconds * 1000);
                        return [null, z ? 1 : 0];
                    });
                },
                async exec() {
                    return ops.map((op) => op());
                },
            };
        },
    };
}

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local server_time = redis.call("TIME")
local now = (tonumber(server_time[1]) * 1000) + math.floor(tonumber(server_time[2]) / 1000)
local window_ms = tonumber(ARGV[1])
local max_requests = tonumber(ARGV[2])
local member = ARGV[3]

redis.call("ZREMRANGEBYSCORE", key, "-inf", now - window_ms)
local count = redis.call("ZCARD", key)
local allowed = 0

if count < max_requests then
    redis.call("ZADD", key, now, member)
    count = count + 1
    allowed = 1
end

redis.call("PEXPIRE", key, window_ms + 1000)
local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
local reset_time = now + window_ms
if oldest[2] then
    reset_time = tonumber(oldest[2]) + window_ms
end

return { allowed, count, reset_time }
`;

const COMPARE_AND_DELETE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end
return 0
`;

function buildIoRedisClient(): Redis {
    if (globalThis.__redis) return globalThis.__redis;
    const c = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true,
    });
    c.on("error", (err: Error) => console.error("[Redis]", err.message));
    globalThis.__redis = c;
    return c;
}

const useRedis = Boolean(process.env.REDIS_URL);

/**
 * `next build` runs with NODE_ENV=production and imports every route while
 * collecting page data, but no request is ever served during a build, so
 * nothing needs Redis then. Without this exemption the build itself demanded
 * REDIS_URL and failed at `/api/auth/[...all]` in any environment that builds
 * without production secrets. A running production server still fails closed.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (process.env.NODE_ENV === "production" && !useRedis && !isBuildPhase) {
    throw new Error(
        "REDIS_URL is required in production so rate limits and idempotency are shared across instances."
    );
}

const client: Redis | UnifiedClient = useRedis
    ? buildIoRedisClient()
    : buildMemoryClient();

async function redisSetnx(
    key: string,
    value: string,
    ttlSeconds?: number
): Promise<boolean> {
    const ioredis = client as Redis;
    if (ttlSeconds) {
        const result = await ioredis.set(key, value, "EX", ttlSeconds, "NX");
        return result === "OK";
    }
    const result = await ioredis.set(key, value, "NX");
    return result === "OK";
}

export const redis = {
    async get(key: string): Promise<string | null> {
        if (useRedis) return (client as Redis).get(key);
        return (client as UnifiedClient).get(key);
    },

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (useRedis) {
            const ioredis = client as Redis;
            if (ttlSeconds) {
                await ioredis.set(key, value, "EX", ttlSeconds);
            } else {
                await ioredis.set(key, value);
            }
        } else {
            await (client as UnifiedClient).set(key, value, undefined, ttlSeconds);
        }
    },

    async del(key: string): Promise<void> {
        if (useRedis) {
            await (client as Redis).del(key);
        } else {
            await (client as UnifiedClient).del(key);
        }
    },

    async setnx(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
        if (useRedis) {
            return redisSetnx(key, value, ttlSeconds);
        }
        const mem = client as UnifiedClient;
        const result = await mem.setnx(key, value);
        if (result === 1 && ttlSeconds) await mem.expire(key, ttlSeconds);
        return result === 1;
    },

    async compareAndDelete(key: string, expectedValue: string): Promise<boolean> {
        if (useRedis) {
            const result = await (client as Redis).eval(
                COMPARE_AND_DELETE_SCRIPT,
                1,
                key,
                expectedValue
            );
            return Number(result) === 1;
        }
        return (await (client as UnifiedClient).compareAndDelete(key, expectedValue)) === 1;
    },

    async getJson<T>(key: string): Promise<T | null> {
        const raw = await redis.get(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    },

    async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        await redis.set(key, JSON.stringify(value), ttlSeconds);
    },

    async slidingWindow(
        key: string,
        now: number,
        windowMs: number,
        maxRequests: number,
        member: string
    ): Promise<SlidingWindowResult> {
        if (!useRedis) {
            return (client as UnifiedClient).slidingWindow(
                key,
                now,
                windowMs,
                maxRequests,
                member
            );
        }

        const raw = await (client as Redis).eval(
            SLIDING_WINDOW_SCRIPT,
            1,
            key,
            windowMs,
            maxRequests,
            member
        ) as [number | string, number | string, number | string];

        return {
            allowed: Number(raw[0]) === 1,
            count: Number(raw[1]),
            resetTime: Number(raw[2]),
        };
    },

    pipeline(): ReturnType<Redis["pipeline"]> | MemoryPipeline {
        if (useRedis) return (client as Redis).pipeline();
        return (client as UnifiedClient).pipeline();
    },
};

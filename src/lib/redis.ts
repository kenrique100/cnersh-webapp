import Redis from "ioredis";

type StoreEntry = { value: string; expiry: number };

declare global {
    var __redis: Redis | undefined;
    var __redis_mem: Map<string, StoreEntry> | undefined;
    var __redis_zsets: Map<string, Map<string, number>> | undefined;
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
    expire(key: string, seconds: number): Promise<number>;
    pipeline(): MemoryPipeline;
}

function buildMemoryClient(): UnifiedClient {
    if (!globalThis.__redis_mem) globalThis.__redis_mem = new Map();
    if (!globalThis.__redis_zsets) globalThis.__redis_zsets = new Map();

    const mem = globalThis.__redis_mem!;
    const zsets = globalThis.__redis_zsets!;

    setInterval(() => {
        const now = Date.now();
        for (const [k, v] of mem.entries()) {
            if (v.expiry > 0 && v.expiry < now) mem.delete(k);
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
        async expire(key, seconds) {
            const e = mem.get(key);
            if (!e) return 0;
            e.expiry = Date.now() + seconds * 1000;
            return 1;
        },
        pipeline(): MemoryPipeline {
            const ops: Array<() => [null, unknown]> = [];
            return {
                zremrangebyscore(key, min, max) {
                    ops.push(() => {
                        const z = zsets.get(key);
                        if (z) {
                            for (const [m, s] of z) {
                                if (s >= min && s <= max) z.delete(m);
                            }
                        }
                        return [null, 0];
                    });
                },
                zcard(key) {
                    ops.push(() => [null, zsets.get(key)?.size ?? 0]);
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
                        const e = mem.get(key);
                        if (e) e.expiry = Date.now() + seconds * 1000;
                        return [null, 1];
                    });
                },
                async exec() {
                    return ops.map((op) => op());
                },
            };
        },
    };
}

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

    pipeline(): ReturnType<Redis["pipeline"]> | MemoryPipeline {
        if (useRedis) return (client as Redis).pipeline();
        return (client as UnifiedClient).pipeline();
    },
};
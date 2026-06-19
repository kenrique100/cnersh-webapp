import Redis from "ioredis";

type InMemoryStore = Map<string, string>;

// Cache the Redis client on globalThis to avoid creating multiple connections
// during hot reloads or serverless cold starts.
declare global {
  // eslint-disable-next-line no-var
  var __global_redis_client: Redis | null | undefined;
  // eslint-disable-next-line no-var
  var __global_inmemory_store: InMemoryStore | null | undefined;
  // eslint-disable-next-line no-var
  var __global_inmemory_timers: Map<string, ReturnType<typeof setTimeout>> | undefined;
}

let client: Redis | null = typeof globalThis !== "undefined" ? globalThis.__global_redis_client ?? null : null;
let inMemory: InMemoryStore | null = typeof globalThis !== "undefined" ? globalThis.__global_inmemory_store ?? null : null;
let inMemoryTimers: Map<string, ReturnType<typeof setTimeout>> | undefined = typeof globalThis !== "undefined" ? globalThis.__global_inmemory_timers : undefined;

if (!client && process.env.REDIS_URL) {
  // create and cache on globalThis
  client = new Redis(process.env.REDIS_URL);
  client.on("error", (err) => console.error("Redis error:", err));
  if (typeof globalThis !== "undefined") globalThis.__global_redis_client = client;
}

if (!inMemory) {
  inMemory = new Map();
  if (typeof globalThis !== "undefined") globalThis.__global_inmemory_store = inMemory;
}

if (!inMemoryTimers) {
  inMemoryTimers = new Map();
  if (typeof globalThis !== "undefined") globalThis.__global_inmemory_timers = inMemoryTimers;
}

export const redis = {
  async get(key: string): Promise<string | null> {
    if (client) {
      return await client.get(key);
    }
    return inMemory!.get(key) ?? null;
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (client) {
      if (ttlSeconds) await client.set(key, value, "EX", ttlSeconds);
      else await client.set(key, value);
      return;
    }

    // In-memory fallback (tests / single-instance dev only)
    inMemory!.set(key, value);

    // Clear any existing timer for this key
    const existing = inMemoryTimers!.get(key);
    if (existing) clearTimeout(existing);

    if (ttlSeconds) {
      const t = setTimeout(() => {
        inMemory!.delete(key);
        inMemoryTimers!.delete(key);
      }, ttlSeconds * 1000);
      // In Node.js, unref so timers don't keep the process alive
      if (typeof (t as any).unref === "function") (t as any).unref();
      inMemoryTimers!.set(key, t);
    }
  },

  async setnx(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (client) {
      const args: Array<string | number> = [key, value];
      if (ttlSeconds) args.push("EX", ttlSeconds);
      args.push("NX");
      // @ts-ignore ioredis overloads
      const res = await (client as any).set(...(args as any));
      return res === "OK";
    }

    if (inMemory!.has(key)) return false;
    inMemory!.set(key, value);

    // Clear any existing timer for this key
    const existing = inMemoryTimers!.get(key);
    if (existing) clearTimeout(existing);

    if (ttlSeconds) {
      const t = setTimeout(() => {
        inMemory!.delete(key);
        inMemoryTimers!.delete(key);
      }, ttlSeconds * 1000);
      if (typeof (t as any).unref === "function") (t as any).unref();
      inMemoryTimers!.set(key, t);
    }

    return true;
  },

  async del(key: string): Promise<void> {
    if (client) {
      await client.del(key);
      return;
    }

    inMemory!.delete(key);
    const existing = inMemoryTimers!.get(key);
    if (existing) {
      clearTimeout(existing);
      inMemoryTimers!.delete(key);
    }
  },
};

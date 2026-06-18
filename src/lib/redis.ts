import Redis from "ioredis";

type InMemoryStore = Map<string, string>;

let inMemory: InMemoryStore | null = null;
let client: Redis | null = null;

if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL);
  client.on("error", (err) => console.error("Redis error:", err));
} else {
  // Fallback used in tests / environments without Redis
  inMemory = new Map();
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
    inMemory!.set(key, value);
    if (ttlSeconds) {
      setTimeout(() => inMemory!.delete(key), ttlSeconds * 1000).unref();
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
    if (ttlSeconds) {
      setTimeout(() => inMemory!.delete(key), ttlSeconds * 1000).unref();
    }
    return true;
  },

  async del(key: string): Promise<void> {
    if (client) {
      await client.del(key);
      return;
    }
    inMemory!.delete(key);
  },
};

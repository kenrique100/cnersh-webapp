import { redis } from "@/lib/redis";

const PREFIX = "idempotency:";

export async function claimKey(key: string, ttlSeconds = 30): Promise<boolean> {
    return await redis.setnx(PREFIX + key, "LOCK", ttlSeconds);
}

export async function saveResponse(key: string, status: number, body: unknown, ttlSeconds = 24 * 60 * 60): Promise<void> {
    const payload = JSON.stringify({ status, body });
    await redis.set(PREFIX + key, payload, ttlSeconds);
}

export async function getResponse(key: string): Promise<{ status: number; body: unknown } | null> {
    const raw = await redis.get(PREFIX + key);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null && "status" in parsed && "body" in parsed) {
            return parsed as { status: number; body: unknown };
        }
        return null;
    } catch {
        return null;
    }
}

export async function clearKey(key: string): Promise<void> {
    await redis.del(PREFIX + key);
}
import { redis } from "@/lib/redis";

export interface StoredResponse {
    status: number;
    body: unknown;
}

const RESP = "idemp:resp:";
const LOCK = "idemp:lock:";

export async function getResponse(key: string): Promise<StoredResponse | null> {
    return redis.getJson<StoredResponse>(`${RESP}${key}`);
}

export async function saveResponse(
    key: string,
    status: number,
    body: unknown,
    ttlSeconds: number
): Promise<void> {
    await redis.setJson(`${RESP}${key}`, { status, body }, ttlSeconds);
}

export async function claimKey(key: string, ttlSeconds: number): Promise<boolean> {
    return redis.setnx(`${LOCK}${key}`, "1", ttlSeconds);
}

export async function releaseKey(key: string): Promise<void> {
    await redis.del(`${LOCK}${key}`);
}
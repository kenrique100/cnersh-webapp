import { redis } from "@/lib/redis";

export interface StoredResponse {
    status: number;
    body: unknown;
    requestHash?: string;
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
    ttlSeconds: number,
    requestHash?: string
): Promise<void> {
    await redis.setJson(
        `${RESP}${key}`,
        { status, body, ...(requestHash ? { requestHash } : {}) },
        ttlSeconds
    );
}

export async function claimKey(
    key: string,
    ttlSeconds: number,
    claimValue = "1"
): Promise<boolean> {
    return redis.setnx(`${LOCK}${key}`, claimValue, ttlSeconds);
}

export async function getClaim(key: string): Promise<string | null> {
    return redis.get(`${LOCK}${key}`);
}

export async function releaseKey(key: string, claimValue?: string): Promise<void> {
    if (claimValue) {
        await redis.compareAndDelete(`${LOCK}${key}`, claimValue);
        return;
    }
    await redis.del(`${LOCK}${key}`);
}

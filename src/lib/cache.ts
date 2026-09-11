import { redis } from "@/lib/redis";
import { createHash } from "node:crypto";

export interface CachedPreview {
    title: string;
    description: string;
    image: string;
    domain: string;
}

const TTL_SECONDS = 60 * 60 * 24; // 24h
const NAMESPACE = "linkpreview:v1:";

function cacheKey(url: string): string {
    const hash = createHash("sha256").update(url).digest("hex");
    return `${NAMESPACE}${hash}`;
}

export async function getCachedPreview(url: string): Promise<CachedPreview | null> {
    try {
        const raw = await redis.get(cacheKey(url));
        if (!raw) return null;
        return JSON.parse(raw) as CachedPreview;
    } catch {
        return null; // cache errors are never fatal - just fetch fresh
    }
}

export async function setCachedPreview(url: string, data: CachedPreview): Promise<void> {
    try {
        await redis.set(cacheKey(url), JSON.stringify(data), TTL_SECONDS);
    } catch {
        // best-effort - ignore
    }
}
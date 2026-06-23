import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export interface TrendingTag {
    tag: string;
    posts: number;
    score: number;
}

const CACHE_TTL = 120;
const cacheKey = (limit: number) => `trending:tags:v2:${limit}`;

function capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fromMaterializedView(limit: number): Promise<TrendingTag[]> {
    const rows = await db.$queryRaw<{
        tag_norm: string;
        count: bigint;
        score: number;
    }[]>`
        SELECT tag_norm, count, score
        FROM mv_trending_tags
        ORDER BY score DESC, count DESC
            LIMIT ${limit}
    `;
    return rows.map((r) => ({
        tag: capitalizeWords(r.tag_norm),
        posts: Number(r.count),
        score: r.score,
    }));
}

async function fromRawQuery(limit: number): Promise<TrendingTag[]> {
    const rows = await db.$queryRaw<{ tag: string; count: bigint }[]>`
        SELECT LOWER(TRIM(u.tag)) AS tag, COUNT(*) AS count
        FROM post p
            CROSS JOIN LATERAL unnest(p.tags) AS u(tag)
        WHERE p.deleted = false
          AND TRIM(u.tag) <> ''
          AND p."createdAt" > NOW() - INTERVAL '7 days'
        GROUP BY LOWER(TRIM(u.tag))
        HAVING COUNT(*) >= 3
        ORDER BY count DESC
            LIMIT ${limit}
    `;
    return rows.map((r) => ({
        tag: capitalizeWords(r.tag),
        posts: Number(r.count),
        score: Number(r.count),
    }));
}

export async function getTrendingTags(limit: number): Promise<TrendingTag[]> {
    const key = cacheKey(limit);
    const cached = await redis.getJson<TrendingTag[]>(key);
    if (cached) return cached;

    let tags: TrendingTag[];

    try {
        tags = await fromMaterializedView(limit);
        await redis.setJson(key, tags, CACHE_TTL);
    } catch (err) {
        console.error("[TrendingService] MV unavailable, falling back:", err);
        tags = await fromRawQuery(limit);
        await redis.setJson(key, tags, 30);
    }

    return tags;
}
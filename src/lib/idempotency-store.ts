import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

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

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type ReserveResult<T> =
    | { status: "reserved"; recordId: string }
    | { status: "completed"; response: T }
    | { status: "in-progress" };

export async function reserveIdempotencyKey<T>(opts: {
    key: string;
    userId: string;
    action: string;
    ttlMs?: number;
}): Promise<ReserveResult<T>> {
    const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = new Date(Date.now() + ttlMs);

    db.idempotencyKey
        .deleteMany({ where: { userId: opts.userId, expiresAt: { lt: new Date() } } })
        .catch(() => {});

    try {
        const record = await db.idempotencyKey.create({
            data: { key: opts.key, userId: opts.userId, action: opts.action, expiresAt },
            select: { id: true },
        });
        return { status: "reserved", recordId: record.id };
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            const existing = await db.idempotencyKey.findFirst({
                where: { key: opts.key, userId: opts.userId, action: opts.action },
                select: { response: true },
            });
            if (!existing || existing.response === null) return { status: "in-progress" };
            return { status: "completed", response: existing.response as T };
        }
        throw err;
    }
}

export async function storeIdempotentResponse<T>(
    key: string,
    userId: string,
    action: string,
    response: T
): Promise<void> {
    await db.idempotencyKey.updateMany({
        where: { key, userId, action },
        data: { response: response as Prisma.InputJsonValue },
    });
}

export async function releaseIdempotencyKey(
    key: string,
    userId: string,
    action: string
): Promise<void> {
    await db.idempotencyKey.deleteMany({
        where: { key, userId, action, response: { equals: Prisma.DbNull } },
    });
}
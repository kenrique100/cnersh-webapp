import "server-only";

import Redis from "ioredis";
import { redisStorage } from "@better-auth/redis-storage";

/**
 * Dedicated ioredis client for Better Auth secondary storage.
 *
 * This is intentionally separate from `@/lib/redis` (the application's
 * rate-limit / idempotency cache). Better Auth session records must survive
 * process restarts and be shared across instances, and we don't want that
 * durability profile to be coupled to the in-memory fallback used by the
 * application cache.
 *
 * `lazyConnect: true` means no connection is opened until the first command
 * runs, so importing this module during `next build` does not require Redis
 * to be reachable.
 */
const redisClient = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
});

redisClient.on("error", (error: Error) => {
    console.error("[Better Auth Redis]", error.message);
});

/**
 * Better Auth secondary storage adapter backed by Redis.
 *
 * When wired into `betterAuth({ secondaryStorage })`, Better Auth stores
 * session records in Redis by default (rather than the database). The browser
 * continues to hold the session cookie; the authoritative session record
 * lives here.
 *
 * @see https://better-auth.com/docs/concepts/session-management
 */
export const authSecondaryStorage = redisStorage({
    client: redisClient,
    keyPrefix: "better-auth:",
});
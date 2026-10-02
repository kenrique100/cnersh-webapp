import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { z } from "zod";

export const uploadthingEnvSchema = z.object({
    UPLOADTHING_TOKEN: z.string().startsWith("eyJ", "UPLOADTHING_TOKEN must be a v6 JWT token"),
});

function normalizeSslMode(url: string): string {
    try {
        const parsed = new URL(url);
        const sslmode = parsed.searchParams.get("sslmode");
        if (sslmode && ["prefer", "require", "verify-ca"].includes(sslmode)) {
            parsed.searchParams.set("sslmode", "verify-full");
            return parsed.toString();
        }
        return url;
    } catch {
        return url;
    }
}

/**
 * Per-instance pool cap.
 *
 * The runtime `DATABASE_URL` MUST point at a pooled address (PgBouncer,
 * Neon pooler, Supabase pooler, etc.). The pooler caps the total number of
 * connections the database ever sees; this value caps how many each
 * individual serverless instance may open.
 *
 * Default 5 is safe for a small number of Fluid Compute instances behind a
 * shared pooler. See docs/DEPLOYMENT.md for the sizing formula.
 */
const POOL_MAX = Number(process.env.DB_POOL_MAX ?? "5");

/** Close idle connections quickly so slots are freed for other instances. */
const POOL_IDLE_TIMEOUT_MS = 5_000;

/**
 * How long an instance waits for a free connection before throwing.
 * Kept relatively high because a transient pooler queue is preferable to
 * a hard 5xx on a page render.
 */
const POOL_CONNECTION_TIMEOUT_MS = 20_000;

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient;
    pgPool?: Pool;
};

function createPool(): Pool {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL must be set");
    }
    return new Pool({
        connectionString: normalizeSslMode(connectionString),
        max: POOL_MAX,
        idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
        allowExitOnIdle: true,
    });
}

const pool = globalForPrisma.pgPool ?? createPool();
globalForPrisma.pgPool = pool;

/**
 * On Vercel Fluid Compute, `attachDatabasePool` registers the pool with the
 * runtime so that idle connections are drained when the function suspends.
 *
 * The symbol is not present on every release of `@vercel/functions` — it has
 * moved between the root entry and subpaths across versions. We therefore
 * probe for it at runtime with a local structural type instead of importing
 * it by name. This makes the file compile against any release that ships the
 * package, and behave identically when the helper is available.
 *
 * - Skipped on every non-Vercel environment (local, Docker, CI, tests).
 * - Loaded lazily so `@vercel/functions` is never required at build time.
 * - Absence of the function is not an error — the app still works.
 */
if (process.env.VERCEL === "1") {
    void (async () => {
        try {
            const mod = (await import("@vercel/functions")) as unknown as {
                attachDatabasePool?: (pool: Pool) => void;
                default?: {
                    attachDatabasePool?: (pool: Pool) => void;
                };
            };
            const attach =
                mod.attachDatabasePool ?? mod.default?.attachDatabasePool;
            if (typeof attach === "function") {
                attach(pool);
            } else {
                console.warn(
                    "[db] attachDatabasePool not exported by this version of @vercel/functions; idle connections will not be drained on suspend."
                );
            }
        } catch (err) {
            // Only surfaced once, at instance boot, to keep logs quiet.
            console.warn(
                "[db] @vercel/functions unavailable:",
                err instanceof Error ? err.message : err
            );
        }
    })();
}

const adapter = new PrismaPg(pool);

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ["error", "warn"],
        errorFormat: "pretty",
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}

let isCleaningUp = false;
const cleanup = async () => {
    if (isCleaningUp) return;
    isCleaningUp = true;
    try {
        await db.$disconnect();
    } catch (error) {
        console.error("Error during DB cleanup:", error);
    }
};

process.on("beforeExit", cleanup);
process.on("SIGINT", async () => {
    await cleanup();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(0);
});
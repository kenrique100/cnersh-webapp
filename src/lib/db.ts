import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient;
    pool?: Pool;
};

const createPool = () => {
    if (globalForPrisma.pool) {
        return globalForPrisma.pool;
    }

    // In production on Neon/Vercel, DATABASE_URL is the pgBouncer pooler URL.
    // The pooler does NOT support prepared statements — pass no_prepare=true
    // and pgbouncer=true to disable them so Prisma doesn’t throw P2010 errors.
    const connectionString = process.env.DATABASE_URL!;

    const pool = new Pool({
        connectionString,
        max: 10, // Neon free tier allows ~100 connections; keep headroom
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        allowExitOnIdle: false,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        ssl: { rejectUnauthorized: false }, // required for Neon
    });

    pool.on("error", (err) => {
        console.error("[db] Unexpected idle-client error:", err);
    });

    if (process.env.NODE_ENV !== "production") {
        globalForPrisma.pool = pool;
    }

    return pool;
};

const pool = createPool();
const adapter = new PrismaPg(pool);

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
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
        await pool.end();
    } catch (error) {
        console.error("[db] Cleanup error:", error);
    }
};

process.on("beforeExit", cleanup);
process.on("SIGINT",  async () => { await cleanup(); process.exit(0); });
process.on("SIGTERM", async () => { await cleanup(); process.exit(0); });

/**
 * db.ts — Prisma v7 singleton
 *
 * In Prisma v7 the adapter is passed to the PrismaClient constructor directly.
 * The connection URL lives only in prisma.config.ts / the Pool constructor.
 * Do NOT import adapter config from prisma.config.ts here — that file is
 * only loaded by the Prisma CLI. Instead we create our own pool for runtime.
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function createPool(): Pool {
  if (globalForPrisma.pool) return globalForPrisma.pool;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    ssl: { rejectUnauthorized: false }, // required for Neon on Vercel
  });

  pool.on("error", (err) => {
    console.error("[db] idle-client error:", err);
  });

  // Cache the pool in dev to survive hot-reloads
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  return pool;
}

const pool = createPool();
const adapter = new PrismaPg(pool);

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    errorFormat: "pretty",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// ─── Graceful shutdown ──────────────────────────────────────────────
let isCleaningUp = false;
async function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  try {
    await db.$disconnect();
    await pool.end();
  } catch (err) {
    console.error("[db] cleanup error:", err);
  }
}

process.on("beforeExit", cleanup);
process.on("SIGINT",  async () => { await cleanup(); process.exit(0); });
process.on("SIGTERM", async () => { await cleanup(); process.exit(0); });

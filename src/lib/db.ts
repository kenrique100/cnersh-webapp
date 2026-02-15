import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient;
    pool?: Pool; // ✅ Add pool to global
};

// ✅ Create pool singleton with better configuration
const createPool = () => {
    if (globalForPrisma.pool) {
        console.log("♻️  Reusing existing database pool");
        return globalForPrisma.pool;
    }

    console.log("🔄 Creating new database pool...");

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL!,
        max: 20, // Increased to handle concurrent requests in cloud environments
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000, // ✅ Increased from 5000 to 20000
        allowExitOnIdle: false,
        keepAlive: true, // ✅ Added
        keepAliveInitialDelayMillis: 10000, // ✅ Added
    });

    // ✅ Better error handler - log but don't crash immediately
    pool.on("error", (err) => {
        console.error("❌ Unexpected error on idle database client:", err);
        // Don't exit immediately - let Prisma handle reconnection
    });

    pool.on("connect", () => {
        console.log("✅ Database client connected to pool");
    });

    // ✅ Store in global for development hot-reload
    if (process.env.NODE_ENV !== "production") {
        globalForPrisma.pool = pool;
    }

    return pool;
};

const pool = createPool();
const adapter = new PrismaPg(pool);

export const db =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: ["error", "warn"],
        errorFormat: "pretty",
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}

// ✅ Graceful shutdown handlers
let isCleaningUp = false;

const cleanup = async () => {
    if (isCleaningUp) {
        return;
    }
    isCleaningUp = true;
    
    console.log("🔄 Shutting down database connections...");
    try {
        await db.$disconnect();
        await pool.end();
        console.log("✅ Database connections closed");
    } catch (error) {
        console.error("❌ Error during cleanup:", error);
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
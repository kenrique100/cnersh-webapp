import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";

// Strict validation block to catch missing Bunny setup configurations during server boot
export const bunnyEnvSchema = z.object({
    BUNNY_STORAGE_ZONE: z.string().min(1, "BUNNY_STORAGE_ZONE environment variable is missing"),
    BUNNY_STORAGE_PASSWORD: z.string().min(1, "BUNNY_STORAGE_PASSWORD environment variable is missing"),
    BUNNY_STORAGE_API_URL: z.string().min(1, "BUNNY_STORAGE_API_URL environment variable is missing"),
    BUNNY_PULL_ZONE_URL: z.string().url("BUNNY_PULL_ZONE_URL must be a valid HTTPS URL"),
});

if (typeof window === "undefined") {
    bunnyEnvSchema.parse(process.env);
}

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient;
};

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
});

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

// Graceful connection lifecycle management
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
process.on("SIGINT", async () => { await cleanup(); process.exit(0); });
process.on("SIGTERM", async () => { await cleanup(); process.exit(0); });
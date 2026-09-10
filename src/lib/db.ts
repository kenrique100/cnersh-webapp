import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";

// Validation for UploadThing token on server boot
export const uploadthingEnvSchema = z.object({
    UPLOADTHING_TOKEN: z.string().min(1, "UPLOADTHING_TOKEN is required"),
});

if (typeof window === "undefined") {
    uploadthingEnvSchema.parse(process.env);
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
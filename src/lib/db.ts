import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient;
};

const adapter = new PrismaPg({
    connectionString: normalizeSslMode(process.env.DATABASE_URL!),
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

import {PrismaClient} from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
})

const adapter = new PrismaPg(pool)

export const db =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: ['error', 'warn'],
    })

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
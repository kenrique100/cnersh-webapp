import {PrismaClient} from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 20, // Increased pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000, // Increased to 20 seconds
    // Add these important options:
    allowExitOnIdle: false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
})

// Add error handler for the pool
pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err)
    process.exit(-1)
})

const adapter = new PrismaPg(pool)

export const db =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
        errorFormat: 'pretty',
    })

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}

process.on('beforeExit', async () => {
    await db.$disconnect()
    await pool.end()
})
import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

/**
 * Normalize `sslmode` in a PostgreSQL connection string so that the
 * deprecated aliases (`prefer`, `require`, `verify-ca`) are rewritten
 * to `verify-full`.  This silences the pg v8 security warning while
 * preserving the behaviour that pg already enforces today.
 */
function normalizeSslMode(url: string): string {
    try {
        const parsed = new URL(url);
        const sslmode = parsed.searchParams.get('sslmode');
        if (sslmode && ['prefer', 'require', 'verify-ca'].includes(sslmode)) {
            parsed.searchParams.set('sslmode', 'verify-full');
            return parsed.toString();
        }
        return url;
    } catch {
        return url;
    }
}

const pool = new Pool({
    connectionString: normalizeSslMode(process.env.DATABASE_URL!), // pooled endpoint
})

const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
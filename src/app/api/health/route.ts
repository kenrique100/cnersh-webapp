import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint
 * Checks application and database health
 */
export async function GET() {
    const startTime = Date.now();

    try {
        // Check database connectivity
        await db.$queryRaw`SELECT 1`;

        const responseTime = Date.now() - startTime;

        return NextResponse.json(
            {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'up',
                    responseTime: `${responseTime}ms`,
                },
                uptime: process.uptime(),
                version: process.env.npm_package_version || '0.1.0',
            },
            { status: 200 }
        );
    } catch (error) {
        const responseTime = Date.now() - startTime;

        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'down',
                    responseTime: `${responseTime}ms`,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
                uptime: process.uptime(),
            },
            { status: 503 }
        );
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

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
            { status: 200, headers: NO_STORE_HEADERS }
        );
    } catch (error) {
        console.error('[health] database check failed:', error);
        const responseTime = Date.now() - startTime;

        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'down',
                    responseTime: `${responseTime}ms`,
                },
                uptime: process.uptime(),
            },
            { status: 503, headers: NO_STORE_HEADERS }
        );
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Readiness probe endpoint
 * Used by load balancers to determine if the application is ready to serve traffic
 */
export async function GET() {
    try {
        // Check if database is accessible
        await db.$queryRaw`SELECT 1`;

        // Application is ready
        return NextResponse.json(
            {
                ready: true,
                timestamp: new Date().toISOString(),
            },
            { status: 200 }
        );
    } catch (error) {
        // Application is not ready
        return NextResponse.json(
            {
                ready: false,
                timestamp: new Date().toISOString(),
                reason: 'Database unavailable',
            },
            { status: 503 }
        );
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadthingEnvSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET() {
    const startTime = Date.now();

    let databaseUp = false;
    let databaseError: string | undefined;
    try {
        await db.$queryRaw`SELECT 1`;
        databaseUp = true;
    } catch (error) {
        console.error('[health] database check failed:', error);
        databaseError = error instanceof Error ? error.message : 'Unknown error';
    }
    const storageResult = uploadthingEnvSchema.safeParse({
        UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    });
    const storageConfigured = storageResult.success;
    const storageError = storageResult.success
        ? undefined
        : storageResult.error.issues.map((i) => i.message).join('; ');

    if (!storageConfigured) {
        console.error('[health] storage check failed:', storageError);
    }
    const responseTime = Date.now() - startTime;

    const baseBody = {
        timestamp: new Date().toISOString(),
        checks: {
            database: databaseUp ? 'up' : 'down',
            storage: storageConfigured ? 'configured' : 'misconfigured',
            responseTime: `${responseTime}ms`,
        },
        uptime: process.uptime(),
        version: process.env.npm_package_version || '0.1.0',
    };

    // DB is critical: if it's down, the app cannot serve requests.
    if (!databaseUp) {
        return NextResponse.json(
            {
                ...baseBody,
                status: 'unhealthy',
                errors: { database: databaseError },
            },
            { status: 503, headers: NO_STORE_HEADERS }
        );
    }

    // DB is up, storage is not: app is partially functional.
    if (!storageConfigured) {
        return NextResponse.json(
            {
                ...baseBody,
                status: 'degraded',
                errors: { storage: storageError },
            },
            { status: 503, headers: NO_STORE_HEADERS }
        );
    }

    // Everything is fine.
    return NextResponse.json(
        { ...baseBody, status: 'healthy' },
        { status: 200, headers: NO_STORE_HEADERS }
    );
}
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db';
import { timingSafeEqual } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

function hasValidCronSecret(request: Request, expectedSecret: string): boolean {
    const prefix = 'Bearer ';
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith(prefix)) return false;

    const actual = Buffer.from(authorization.slice(prefix.length));
    const expected = Buffer.from(expectedSecret);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error('[cron:health-check] CRON_SECRET is not configured');
        return NextResponse.json(
            { error: 'Service unavailable' },
            { status: 503, headers: NO_STORE_HEADERS }
        );
    }
    if (!hasValidCronSecret(request, cronSecret)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401, headers: NO_STORE_HEADERS }
        );
    }

    try {
        return await Sentry.withMonitor(
            'cnersh-health-check',
            async () => {
                const startTime = Date.now();
                const results: {
                    database: boolean;
                    sessionsCleaned: number;
                    errors: string[];
                } = {
                    database: false,
                    sessionsCleaned: 0,
                    errors: [],
                };

                // 1. Database connectivity check
                try {
                    await db.$queryRaw`SELECT 1`;
                    results.database = true;
                } catch (error) {
                    results.errors.push('database');
                    Sentry.captureException(error, {
                        tags: { cron: 'health-check', check: 'database' },
                    });
                }

                // 2. Prune stale/expired sessions older than 30 days
                let deletedCount = 0;
                try {
                    const deleted = await db.session.deleteMany({
                        where: {
                            expiresAt: { lt: new Date() },
                        },
                    });
                    deletedCount = deleted.count;
                    results.sessionsCleaned = deletedCount;
                } catch (error) {
                    results.errors.push('session-cleanup');
                    Sentry.captureException(error, {
                        tags: { cron: 'health-check', check: 'session-cleanup' },
                    });
                }

                const elapsed = Date.now() - startTime;

                // Determine overall health status
                const isHealthy = results.database && results.errors.length === 0;

                Sentry.logger.info('[cron:health-check] Completed', {
                    durationMs: elapsed,
                    healthy: isHealthy,
                    expiredSessionsRemoved: deletedCount,
                    errors: results.errors,
                });

                if (!isHealthy) {
                    Sentry.captureMessage('Health check failed', {
                        level: 'error',
                        extra: {
                            errors: results.errors,
                            checks: {
                                database: results.database,
                            },
                        },
                    });
                }

                return NextResponse.json({
                    ok: isHealthy,
                    timestamp: new Date().toISOString(),
                    durationMs: elapsed,
                    checks: {
                        database: results.database,
                        sessionsCleaned: results.sessionsCleaned,
                    },
                    errors: results.errors,
                }, {
                    status: isHealthy ? 200 : 500,
                    headers: NO_STORE_HEADERS,
                });
            },
            {
                schedule: { type: 'crontab', value: '0 0 * * *' },
                checkinMargin: 10,
                maxRuntime: 5,
                timezone: 'UTC',
            },
        );
    } catch (error) {
        Sentry.captureException(error, {
            tags: { cron: 'health-check', check: 'unhandled' },
        });
        return NextResponse.json(
            { ok: false, error: 'Health check failed' },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
}

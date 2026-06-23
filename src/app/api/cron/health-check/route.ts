import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Nightly health-check cron job (runs at 00:00 UTC every day).
 * Instrumented with Sentry Cron Monitoring (MCP – Monitor Check-in Protocol)
 * so Sentry records a check-in for each execution and alerts on missed / failed runs.
 *
 * Vercel automatically calls this endpoint on the schedule defined in vercel.json
 * and injects the Authorization header with the CRON_SECRET value.
 */
export async function GET(request: Request) {
    // Reject requests that are not coming from Vercel's cron scheduler.
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return await Sentry.withMonitor(
        'cnersh-health-check',
        async () => {
            const startTime = Date.now();
            const results: {
                database: boolean;
                sessionsCleaned: number;
                viewExists: boolean;
                errors: string[];
            } = {
                database: false,
                sessionsCleaned: 0,
                viewExists: false,
                errors: [],
            };

            // 1. Database connectivity check
            try {
                await db.$queryRaw`SELECT 1`;
                results.database = true;
            } catch (error) {
                results.errors.push(`Database connection failed: ${error}`);
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
                results.errors.push(`Session cleanup failed: ${error}`);
                Sentry.captureException(error, {
                    tags: { cron: 'health-check', check: 'session-cleanup' },
                });
            }

            // 3. Check if materialized view exists
            try {
                const viewExists = await db.$queryRaw`
                    SELECT EXISTS (
                        SELECT 1 FROM pg_matviews 
                        WHERE matviewname = 'mv_trending_tags'
                    ) as exists;
                `;
                // @ts-expect-error - viewExists is a raw query result
                results.viewExists = viewExists[0]?.exists || false;

                if (!results.viewExists) {
                    results.errors.push('Materialized view mv_trending_tags does not exist');
                }
            } catch (error) {
                results.errors.push(`View check failed: ${error}`);
                Sentry.captureException(error, {
                    tags: { cron: 'health-check', check: 'view-check' },
                });
            }

            const elapsed = Date.now() - startTime;

            // Determine overall health status
            const isHealthy = results.database && results.errors.length === 0;

            Sentry.logger.info('[cron:health-check] Completed', {
                durationMs: elapsed,
                healthy: isHealthy,
                expiredSessionsRemoved: deletedCount,
                viewExists: results.viewExists,
                errors: results.errors,
            });

            if (!isHealthy) {
                Sentry.captureMessage('Health check failed', {
                    level: 'error',
                    extra: {
                        errors: results.errors,
                        checks: {
                            database: results.database,
                            viewExists: results.viewExists,
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
                    viewExists: results.viewExists,
                },
                errors: results.errors,
            }, {
                status: isHealthy ? 200 : 500,
            });
        },
        {
            schedule: { type: 'crontab', value: '0 0 * * *' },
            checkinMargin: 10,  // minutes of grace before a check-in is considered missed
            maxRuntime: 5,      // minutes before a check-in is considered timed out
            timezone: 'UTC',
        },
    );
}
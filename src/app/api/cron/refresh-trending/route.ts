import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Refreshes the trending tags materialized view every 2 minutes.
 * Instrumented with Sentry Cron Monitoring for reliability tracking.
 *
 * Vercel automatically calls this endpoint on the schedule defined in vercel.json
 * and injects the Authorization header with the CRON_SECRET value.
 */
export async function GET(request: NextRequest) {
    // Reject unauthorized requests
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return await Sentry.withMonitor(
        'cnersh-trending-refresh',
        async () => {
            const startTime = Date.now();

            try {
                // Refresh the materialized view concurrently
                await db.$executeRaw`
                    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_tags;
                `;

                const elapsed = Date.now() - startTime;

                Sentry.logger.info('[cron:refresh-trending] Completed', {
                    durationMs: elapsed,
                });

                return NextResponse.json({
                    success: true,
                    refreshedAt: new Date().toISOString(),
                    durationMs: elapsed,
                });
            } catch (error) {
                const elapsed = Date.now() - startTime;

                Sentry.captureException(error, {
                    tags: { cron: 'refresh-trending' },
                    extra: {
                        durationMs: elapsed,
                    },
                });

                Sentry.logger.error('[cron:refresh-trending] Failed', {
                    durationMs: elapsed,
                    error: error instanceof Error ? error.message : String(error),
                });

                return NextResponse.json(
                    {
                        success: false,
                        error: 'Refresh failed',
                        refreshedAt: new Date().toISOString(),
                        durationMs: elapsed,
                    },
                    { status: 500 }
                );
            }
        },
        {
            schedule: { type: 'crontab', value: '*/2 * * * *' },
            checkinMargin: 1,   // 1 minute grace period (since it runs every 2 minutes)
            maxRuntime: 1,      // 1 minute max runtime
            timezone: 'UTC',
        },
    );
}
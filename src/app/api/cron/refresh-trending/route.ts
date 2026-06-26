import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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
                    extra: { durationMs: elapsed },
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
            checkinMargin: 1,
            maxRuntime: 1,
            timezone: 'UTC',
        },
    );
}
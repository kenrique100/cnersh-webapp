import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
        'cnersh-cron',
        async () => {
            const startTime = Date.now();

            // 1. Database connectivity check
            await db.$queryRaw`SELECT 1`;

            // 2. Prune stale/expired sessions older than 30 days
            const deleted = await db.session.deleteMany({
                where: {
                    expiresAt: { lt: new Date() },
                },
            });

            const elapsed = Date.now() - startTime;

            Sentry.logger.info('[cron:health-check] Completed', {
                durationMs: elapsed,
                expiredSessionsRemoved: deleted.count,
            });

            return NextResponse.json({
                ok: true,
                timestamp: new Date().toISOString(),
                durationMs: elapsed,
                expiredSessionsRemoved: deleted.count,
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

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { timingSafeEqual } from "node:crypto";

import { isErasureConfigured } from "@/lib/erasure/config";
import { reconcileWithJournal, retryUnfinishedRequests } from "@/lib/erasure/deletion-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

function hasValidCronSecret(request: Request, expectedSecret: string): boolean {
    const prefix = "Bearer ";
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith(prefix)) return false;

    const actual = Buffer.from(authorization.slice(prefix.length));
    const expected = Buffer.from(expectedSecret);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Daily erasure sweep:
 *   1. retries deletion requests that are still ACCEPTED/PROCESSING/BLOCKED;
 *   2. reconciles the erasure journal against the application database, so a
 *      restore from backup never quietly brings a deleted account back.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error("[cron:erasure] CRON_SECRET is not configured");
        return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers: NO_STORE_HEADERS });
    }
    if (!hasValidCronSecret(request, cronSecret)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }
    if (!isErasureConfigured()) {
        console.error("[cron:erasure] erasure is not configured; nothing to do");
        return NextResponse.json({ error: "Erasure not configured" }, { status: 503, headers: NO_STORE_HEADERS });
    }

    try {
        return await Sentry.withMonitor("cnersh-erasure-sweep", async () => {
            const startedAt = Date.now();
            const retried = await retryUnfinishedRequests();
            const reconciliation = await reconcileWithJournal();
            const stillBlocked = retried.filter((r) => r.status !== "COMPLETED").length + reconciliation.blocked.length;

            if (stillBlocked > 0) {
                Sentry.captureMessage(`[erasure] ${stillBlocked} deletion request(s) remain blocked`, {
                    level: "warning",
                    tags: { cron: "erasure" },
                });
            }

            return NextResponse.json(
                {
                    ok: true,
                    durationMs: Date.now() - startedAt,
                    retried: retried.length,
                    reconciliation: {
                        checked: reconciliation.checked,
                        consistent: reconciliation.consistent,
                        reapplied: reconciliation.reapplied.length,
                        resumed: reconciliation.resumed.length,
                        blocked: reconciliation.blocked.length,
                    },
                },
                { headers: NO_STORE_HEADERS }
            );
        });
    } catch (error) {
        console.error("[cron:erasure] sweep failed:", error);
        Sentry.captureException(error, { tags: { cron: "erasure" } });
        return NextResponse.json({ error: "Erasure sweep failed" }, { status: 500, headers: NO_STORE_HEADERS });
    }
}

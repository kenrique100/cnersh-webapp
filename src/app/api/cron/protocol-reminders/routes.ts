import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { notifyOwnerRenewalDue } from "@/lib/notify-admins";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

const REMINDER_WINDOW_DAYS = 30;

function hasValidCronSecret(request: Request, expectedSecret: string): boolean {
    const prefix = "Bearer ";
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith(prefix)) return false;

    const actual = Buffer.from(authorization.slice(prefix.length));
    const expected = Buffer.from(expectedSecret);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error("[cron:protocol-reminders] CRON_SECRET is not configured");
        return NextResponse.json(
            { error: "Service unavailable" },
            { status: 503, headers: NO_STORE_HEADERS }
        );
    }
    if (!hasValidCronSecret(request, cronSecret)) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: NO_STORE_HEADERS }
        );
    }

    try {
        return await Sentry.withMonitor(
            "cnersh-protocol-reminders",
            async () => {
                const startTime = Date.now();
                const now = new Date();
                const reminderCutoff = new Date(
                    now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000
                );

                const result = {
                    remindersSent: 0,
                    reminderErrors: 0,
                    expired: 0,
                    expiredErrors: 0,
                };

                // -------------------------------------------------------------
                // 1) Expire protocols whose validity has already lapsed
                //    (run first so the reminder step never races with expiry)
                // -------------------------------------------------------------
                try {
                    const expiredUpdate = await db.project.updateMany({
                        where: {
                            deleted: false,
                            status: "APPROVED",
                            expiresAt: { lt: now },
                        },
                        data: { status: "EXPIRED" },
                    });
                    result.expired = expiredUpdate.count;
                } catch (err) {
                    result.expiredErrors += 1;
                    Sentry.captureException(err, {
                        tags: { cron: "protocol-reminders", step: "expire" },
                    });
                }

                // -------------------------------------------------------------
                // 2) Send 11-month renewal reminders
                //    Candidates: APPROVED, expiresAt within the next 30 days,
                //    reminderSentAt is null.
                // -------------------------------------------------------------
                try {
                    const dueSoon = await db.project.findMany({
                        where: {
                            deleted: false,
                            status: "APPROVED",
                            reminderSentAt: null,
                            expiresAt: {
                                gt: now,
                                lte: reminderCutoff,
                            },
                        },
                        select: {
                            id: true,
                            title: true,
                            expiresAt: true,
                            userId: true,
                            user: {
                                select: { id: true, email: true, name: true },
                            },
                        },
                    });

                    for (const project of dueSoon) {
                        if (!project.expiresAt) continue;

                        // Mark first to avoid duplicate sends on overlapping cron runs
                        const claimed = await db.project.updateMany({
                            where: { id: project.id, reminderSentAt: null },
                            data: { reminderSentAt: now },
                        });
                        if (claimed.count !== 1) continue; // already claimed by another run

                        try {
                            await notifyOwnerRenewalDue({
                                id: project.id,
                                title: project.title,
                                expiresAt: project.expiresAt,
                                owner: {
                                    id: project.user.id,
                                    email: project.user.email,
                                    name: project.user.name,
                                },
                            });
                            result.remindersSent += 1;
                        } catch (err) {
                            // Roll back the claim so the next run can retry
                            await db.project.updateMany({
                                where: { id: project.id },
                                data: { reminderSentAt: null },
                            });
                            result.reminderErrors += 1;
                            console.error(
                                `[cron:protocol-reminders] failed to notify owner for project ${project.id}:`,
                                err
                            );
                            Sentry.captureException(err, {
                                tags: {
                                    cron: "protocol-reminders",
                                    step: "notify-owner",
                                },
                                extra: { projectId: project.id },
                            });
                        }
                    }
                } catch (err) {
                    result.reminderErrors += 1;
                    Sentry.captureException(err, {
                        tags: { cron: "protocol-reminders", step: "reminder-query" },
                    });
                }

                const elapsed = Date.now() - startTime;
                const healthy =
                    result.reminderErrors === 0 && result.expiredErrors === 0;

                Sentry.logger.info("[cron:protocol-reminders] Completed", {
                    durationMs: elapsed,
                    remindersSent: result.remindersSent,
                    expired: result.expired,
                    reminderErrors: result.reminderErrors,
                    expiredErrors: result.expiredErrors,
                });

                if (!healthy) {
                    Sentry.captureMessage("Protocol reminders job had errors", {
                        level: "error",
                        extra: result,
                    });
                }

                return NextResponse.json(
                    {
                        ok: healthy,
                        timestamp: now.toISOString(),
                        durationMs: elapsed,
                        ...result,
                    },
                    {
                        status: healthy ? 200 : 500,
                        headers: NO_STORE_HEADERS,
                    }
                );
            },
            {
                schedule: { type: "crontab", value: "0 8 * * *" },
                checkinMargin: 10,
                maxRuntime: 5,
                timezone: "UTC",
            }
        );
    } catch (error) {
        Sentry.captureException(error, {
            tags: { cron: "protocol-reminders", step: "unhandled" },
        });
        return NextResponse.json(
            { ok: false, error: "Protocol reminders job failed" },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
}
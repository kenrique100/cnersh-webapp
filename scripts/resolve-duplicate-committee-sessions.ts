/**
 * Pre-migration preflight for `20260909223000_unique_committee_session_schedule`.
 *
 * The migration creates a unique index on committee_session(sessionType,
 * sessionDate) and fails while duplicate rows exist. This script reports those
 * duplicates and, when asked, merges each duplicate group into a single row.
 *
 *   npm run db:dedupe:sessions          # read-only report (default)
 *   npm run db:dedupe:sessions:apply    # merge auto-resolvable groups
 *
 * Safety properties:
 *   - report mode opens no write transaction at all;
 *   - apply mode writes a JSON backup of every row it is about to delete
 *     before deleting anything;
 *   - apply mode runs in a single transaction, so a failure leaves the table
 *     untouched;
 *   - groups whose duplicates disagree on status, venue, minutes, notes or
 *     quorum are never merged automatically; they are reported for a human.
 *
 * Run it against the same database the migration will target, using
 * DIRECT_URL (non-pooled) when one is configured.
 */

// Load .env before reading connection settings, matching prisma.config.ts so the
// script works from a plain shell as well as from an environment-injected CI job.
import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import {
    type CommitteeSessionRow,
    type DedupePlan,
    formatPlan,
    planDeduplication,
} from "@/lib/committee-session-dedupe";

const APPLY = process.argv.includes("--apply");
const BACKUP_DIR = path.join(process.cwd(), "backups");

function connectionString(): string {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!url) {
        throw new Error("Set DIRECT_URL or DATABASE_URL before running this script");
    }
    return url;
}

function createClient(): PrismaClient {
    return new PrismaClient({
        adapter: new PrismaPg({ connectionString: connectionString() }),
        log: ["error", "warn"],
    });
}

async function writeArtifact(name: string, payload: unknown): Promise<string> {
    await mkdir(BACKUP_DIR, { recursive: true });
    const file = path.join(BACKUP_DIR, name);
    await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return file;
}

function reviewGuidance(plan: DedupePlan): string {
    const lines = [
        "",
        "These groups were NOT changed because their duplicates hold different committee data.",
        "Decide which row is authoritative, then either correct the losing rows or delete them:",
        "",
    ];
    for (const group of plan.needsReview) {
        lines.push(`-- ${group.key}`);
        lines.push(
            `SELECT id, status, venue, minutes, notes, "quorumMet", agenda, "createdAt", "updatedAt"`,
        );
        lines.push(
            `FROM committee_session WHERE id IN (${[group.keepId, ...group.deleteIds]
                .map((id) => `'${id}'`)
                .join(", ")});`,
        );
        lines.push("");
    }
    return lines.join("\n");
}

async function main(): Promise<void> {
    const prisma = createClient();
    const startedAt = new Date();
    const stamp = startedAt.toISOString().replace(/[:.]/g, "-");

    try {
        const rows = (await prisma.committeeSession.findMany({
            orderBy: [{ sessionType: "asc" }, { sessionDate: "asc" }, { id: "asc" }],
        })) as CommitteeSessionRow[];

        const plan = planDeduplication(rows);

        console.log(APPLY ? "Mode: APPLY (writes)" : "Mode: REPORT (read-only)");
        console.log(formatPlan(plan));

        const reportFile = await writeArtifact(`committee-session-duplicates-${stamp}.json`, {
            generatedAt: startedAt.toISOString(),
            mode: APPLY ? "apply" : "report",
            totalRows: plan.totalRows,
            duplicateGroups: plan.duplicateGroups,
            autoResolvable: plan.autoResolvable,
            needsReview: plan.needsReview,
        });
        console.log(`\nPlan written to ${reportFile}`);

        if (plan.duplicateGroups === 0) {
            console.log("\nNo duplicates found. The unique index migration can be applied safely.");
            return;
        }

        if (plan.needsReview.length > 0) {
            console.log(reviewGuidance(plan));
        }

        if (!APPLY) {
            console.log("Re-run with --apply to merge the auto-resolvable groups.");
            if (plan.needsReview.length > 0) {
                process.exitCode = 2;
            }
            return;
        }

        if (plan.autoResolvable.length === 0) {
            console.log("Nothing to apply: every remaining group needs manual review.");
            process.exitCode = 2;
            return;
        }

        const doomedIds = plan.autoResolvable.flatMap((group) => group.deleteIds);
        const doomedRows = rows.filter((row) => doomedIds.includes(row.id));
        const backupFile = await writeArtifact(
            `committee-session-deleted-rows-${stamp}.json`,
            doomedRows,
        );
        console.log(`Backup of ${doomedRows.length} rows written to ${backupFile}`);

        const applied = await prisma.$transaction(async (tx) => {
            let merged = 0;
            for (const group of plan.autoResolvable) {
                // Re-read inside the transaction so a concurrent edit cannot be
                // silently overwritten by a stale plan.
                const current = await tx.committeeSession.findMany({
                    where: { id: { in: [group.keepId, ...group.deleteIds] } },
                });
                if (current.length !== group.deleteIds.length + 1) {
                    throw new Error(
                        `Group ${group.key} changed while planning; re-run the report before applying`,
                    );
                }

                await tx.committeeSession.update({
                    where: { id: group.keepId },
                    data: {
                        agenda: group.merged.agenda,
                        venue: group.merged.venue,
                        minutes: group.merged.minutes,
                        notes: group.merged.notes,
                        quorumMet: group.merged.quorumMet,
                        status: group.merged.status,
                    },
                });

                await tx.committeeSession.deleteMany({ where: { id: { in: group.deleteIds } } });
                merged += 1;
            }
            return merged;
        });

        console.log(`\nMerged ${applied} duplicate groups and removed ${doomedIds.length} rows.`);

        const remaining = planDeduplication(
            (await prisma.committeeSession.findMany()) as CommitteeSessionRow[],
        );
        if (remaining.duplicateGroups === 0) {
            console.log("Verification: no duplicates remain. Apply the migration next.");
        } else {
            console.log(
                `Verification: ${remaining.duplicateGroups} group(s) still need manual resolution.`,
            );
            process.exitCode = 2;
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    console.error("Duplicate committee session resolution failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});

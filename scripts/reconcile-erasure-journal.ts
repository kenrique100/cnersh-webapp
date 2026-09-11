/**
 * Restore gate for account deletion.
 *
 * Run this after every database restore (and on a schedule; the daily cron
 * does the same). It compares the erasure journal with the application
 * database and re-applies any deletion the restore undid.
 *
 *   npm run erasure:reconcile          # read-only report (default)
 *   npm run erasure:reconcile:apply    # re-apply deletions, retry blocked ones
 *
 * Exit code is 0 when everything is consistent, 2 when inconsistencies were
 * found in report mode, and 1 on error. Wire the report mode into the restore
 * runbook so a restore cannot be declared finished while the exit code is 2.
 */
// Load .env before anything imports the database client (import order matters).
import "dotenv/config";

import { loadErasureConfig } from "@/lib/erasure/config";
import { auditJournalConsistency, reconcileWithJournal } from "@/lib/erasure/deletion-service";
import { pingErasureStore } from "@/lib/erasure/store";

import { hasFlag, run } from "./erasure-lib";

run(async () => {
    loadErasureConfig();
    if (!(await pingErasureStore())) throw new Error("Erasure store is not reachable");

    const findings = await auditJournalConsistency();
    const inconsistent = findings.filter((f) => !f.consistent);
    console.log(`Journal entries: ${findings.length}; inconsistent: ${inconsistent.length}`);
    for (const finding of inconsistent) {
        console.log(
            `  ${finding.subjectId}: journal=${finding.journalStatus} request=${finding.requestStatus ?? "none"}` +
                ` user=${finding.userPresent ? (finding.userResurrected ? "RESURRECTED" : "tombstone") : "absent"}` +
                ` sessions=${finding.liveSessions} credentials=${finding.credentialRows} key=${finding.keyPresent ? "PRESENT" : "destroyed"}`
        );
    }

    if (!hasFlag("--apply")) {
        if (inconsistent.length > 0) {
            console.log("\nRun with --apply to re-apply these deletions.");
            return 2;
        }
        return 0;
    }

    const report = await reconcileWithJournal();
    console.log(
        `\nReconciled ${report.checked} entries: consistent=${report.consistent} reapplied=${report.reapplied.length}` +
            ` resumed=${report.resumed.length} blocked=${report.blocked.length}`
    );
    if (report.blocked.length > 0) {
        console.log(`Still blocked: ${report.blocked.join(", ")}`);
        return 2;
    }
    return 0;
});

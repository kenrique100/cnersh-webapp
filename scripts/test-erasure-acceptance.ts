/**
 * Real-service acceptance regression tests against two disposable LOCAL DBs.
 *
 * Run from the repository root with Node 22:
 *   npx tsx scripts/test-erasure-acceptance.ts --reset
 *
 * --reset explicitly permits replacing ONLY cnersh_test_acceptance and
 * cnersh_test_acceptance_erasure on 127.0.0.1:5432. No environment-supplied
 * database destinations are accepted. Credentials below are synthetic local
 * test credentials. .env is never loaded; migrations read /dev/null instead.
 * Email/storage credentials are absent and no external services are required.
 * Completed fixtures are left in the isolated databases for inspection.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import type { DeletionOutcome } from "../src/lib/erasure/deletion-service";

const APP_DB = "cnersh_test_acceptance";
const STORE_DB = "cnersh_test_acceptance_erasure";
const LOCAL = { host: "127.0.0.1", port: 5432, user: "postgres", password: "postgres" };
const root = process.cwd();
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
    assert(process.argv.slice(2).every((arg) => arg === "--reset"), "Only --reset is supported");
    assert(readFileSync(path.join(root, "package.json"), "utf8").includes('"cnersh-webapp"'), "Run from the cnersh-webapp repository root");

    // Do not inherit destinations, KEKs, notification secrets or dotenv hooks.
    const keep = new Set(["PATH", "HOME", "TMPDIR", "LANG"]);
    for (const name of Object.keys(process.env)) {
        if (!keep.has(name)) delete process.env[name];
    }
    Object.assign(process.env, {
        NODE_ENV: "test",
        DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:5432/${APP_DB}`,
        DIRECT_URL: `postgresql://postgres:postgres@127.0.0.1:5432/${APP_DB}`,
        ERASURE_STORE_URL: `postgresql://postgres:postgres@127.0.0.1:5432/${STORE_DB}`,
        ERASURE_KEK: randomBytes(32).toString("base64"),
        ERASURE_HMAC_KEY: randomBytes(32).toString("base64"),
        DOTENV_CONFIG_PATH: "/dev/null",
        DOTENV_CONFIG_QUIET: "true",
        CHECKPOINT_DISABLE: "1",
    });

    const admin = new Pool({ ...LOCAL, database: "postgres", max: 1 });
    try {
        const version = await admin.query<{ server_version: string }>("SHOW server_version");
        console.log(`PostgreSQL ${version.rows[0].server_version.split(" ")[0]}: isolated erasure acceptance tests`);
        for (const name of [APP_DB, STORE_DB]) {
            const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
            if (existing.rowCount) {
                assert(process.argv.includes("--reset"), `${name} already exists; pass --reset to replace this isolated test database`);
                // name is from the hardcoded allowlist above, never from argv/env.
                await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
            }
            await admin.query(`CREATE DATABASE "${name}"`);
        }
    } finally {
        await admin.end();
    }

    const migrate = spawnSync(process.execPath, [
        path.join(root, "node_modules/prisma/build/index.js"), "migrate", "deploy",
    ], { cwd: root, env: process.env, encoding: "utf8", timeout: 120_000 });
    if (migrate.status !== 0) {
        throw new Error(`Local migration setup failed: ${migrate.error?.message ?? migrate.stderr ?? "unknown error"}`);
    }
    console.log("PASS: all application migrations applied automatically");

    const appPool = new Pool({ ...LOCAL, database: APP_DB, max: 3 });
    const storePool = new Pool({ ...LOCAL, database: STORE_DB, max: 2 });
    const { db } = await import("../src/lib/db");
    const service = await import("../src/lib/erasure/deletion-service");
    const store = await import("../src/lib/erasure/store");
    const keys = await import("../src/lib/erasure/keys");
    const results: string[] = [];
    const passed = (name: string) => {
        results.push(name);
        console.log(`PASS: ${name}`);
    };
    service.__setDbForTests(undefined); // Real Prisma, not a service-logic imitation.
    store.__setErasurePoolForTests(storePool);

    try {
        await storePool.query(readFileSync(path.join(root, "scripts/sql/erasure-store.sql"), "utf8"));
        const index = await appPool.query<{ indexdef: string }>(
            "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'account_deletion_request_userId_key'"
        );
        assert.equal(index.rowCount, 1);
        assert.match(index.rows[0].indexdef, /CREATE UNIQUE INDEX/);
        // The forward migration is safe when the original feature already
        // created the unique index, and on repeated application.
        const forward = readFileSync(path.join(root, "prisma/migrations/20260911150000_enforce_deletion_request_user_uniqueness/migration.sql"), "utf8");
        await appPool.query(forward);
        await appPool.query(forward);
        passed("one-request-per-user unique index exists; forward migration is idempotent");

        async function freshCase(): Promise<void> {
            // Only these explicitly-created local databases are ever cleared.
            await db.user.deleteMany({});
            await storePool.query('TRUNCATE TABLE "erasure_subject_key", "erasure_journal"');
        }
        async function seedAdmin(id: string, banned: boolean | null = false) {
            return db.user.create({
                data: { id, email: `${id}@example.invalid`, name: id, role: "superadmin", banned },
            });
        }
        const request = (userId: string) => service.requestAccountDeletion({ userId, actorId: userId, via: "SELF" });

        /**
         * Hold the SAME advisory lock from an independent real connection.
         * Both service transactions must be observed waiting in pg_locks before
         * release. This proves actual overlap and use of PostgreSQL locks, not
         * just two Promise calls that might happen to execute serially.
         */
        async function competingRequests(ids: string[]) {
            const blocker = await appPool.connect();
            let calls: Promise<PromiseSettledResult<DeletionOutcome>[]> | undefined;
            try {
                await blocker.query("BEGIN");
                await blocker.query("SELECT pg_advisory_xact_lock(716204, 1)");
                calls = Promise.allSettled(ids.map(request));
                const deadline = Date.now() + 10_000;
                let waiters = 0;
                while (Date.now() < deadline) {
                    const locks = await appPool.query<{ waiters: number }>(
                        `SELECT count(*)::int AS waiters FROM pg_locks
                         WHERE locktype = 'advisory' AND classid = 716204 AND objid = 1
                           AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
                           AND NOT granted`
                    );
                    waiters = locks.rows[0].waiters;
                    if (waiters >= ids.length) break;
                    await pause(20);
                }
                assert(waiters >= ids.length, "Both real service transactions must wait on the acceptance lock");
                await blocker.query("COMMIT");
                return await calls;
            } finally {
                await blocker.query("ROLLBACK").catch(() => undefined);
                blocker.release();
                await calls;
            }
        }

        await freshCase();
        const adminIds = ["race-admin-a", "race-admin-b"];
        await Promise.all(adminIds.map((id) => seedAdmin(id)));
        await Promise.all(adminIds.map((id) => keys.getOrCreateSubjectKey(id)));
        const simultaneous = await competingRequests(adminIds);
        const accepted = simultaneous.filter((outcome) => outcome.status === "fulfilled");
        const refused = simultaneous.filter((outcome) => outcome.status === "rejected");
        assert.equal(accepted.length, 1, "Exactly one competing superadmin deletion is accepted");
        assert.equal(refused.length, 1, "The final available superadmin deletion is refused");
        assert(refused[0].reason instanceof service.DeletionRefusedError);
        assert.equal(accepted[0].value.status, "COMPLETED");
        const winner = adminIds[simultaneous.findIndex((outcome) => outcome.status === "fulfilled")];
        const survivor = adminIds.find((id) => id !== winner)!;
        const winnerRequest = await db.accountDeletionRequest.findFirstOrThrow({ where: { userId: winner } });
        assert.equal(await db.accountDeletionRequest.count(), 1);
        assert.equal((await store.listJournalEntries()).length, 1);
        assert.equal(await keys.getSubjectKey(winner), null);
        assert.notEqual(await keys.getSubjectKey(survivor), null);
        assert.equal((await db.user.findUniqueOrThrow({ where: { id: survivor } })).banned, false);
        passed("two simultaneous superadmins: exactly one completes and one is refused (both observed waiting on the real lock)");

        const repeats = await competingRequests([winner, winner]);
        for (const repeat of repeats) {
            assert.equal(repeat.status, "fulfilled");
            if (repeat.status === "fulfilled") {
                assert.equal(repeat.value.requestId, winnerRequest.id);
                assert.equal(repeat.value.status, "COMPLETED");
            }
        }
        assert.equal(await db.accountDeletionRequest.count({ where: { userId: winner } }), 1);
        assert.equal((await store.listJournalEntries()).length, 1);
        passed("simultaneous repeat requests reuse the sole completed request and journal entry");

        for (const status of ["COMPLETED", "BLOCKED"] as const) {
            await db.user.update({
                where: { id: winner },
                data: { email: `${winner}-restored@example.invalid`, name: "Restored synthetic user", erasedAt: null, banned: false, deletionRequestedAt: null },
            });
            await db.accountDeletionRequest.update({
                where: { id: winnerRequest.id },
                data: { status, completedSteps: [...service.DELETION_STEPS] },
            });
            const report = await service.reconcileWithJournal();
            assert.deepEqual(report.blocked, []);
            assert.deepEqual(report.reapplied, [winner]);
            const reconciled = await db.accountDeletionRequest.findFirstOrThrow({ where: { userId: winner } });
            assert.equal(reconciled.id, winnerRequest.id);
            assert.equal(reconciled.status, "COMPLETED");
            assert.equal(reconciled.requestedVia, "RECONCILIATION");
            assert.deepEqual(reconciled.completedSteps, [...service.DELETION_STEPS]);
            assert.equal(await db.accountDeletionRequest.count({ where: { userId: winner } }), 1);
            assert.match((await db.user.findUniqueOrThrow({ where: { id: winner } })).email, /@erased\.invalid$/);
            passed(`restored ${status} request resets stale checkpoints and reuses the same unique row`);
        }

        const disqualified = [
            "banned", "erased", "deletion timestamp", "pending ACCEPTED",
            "pending PROCESSING", "pending BLOCKED", "journal ACCEPTED",
            "journal BLOCKED", "journal COMPLETED",
        ] as const;
        for (const reason of disqualified) {
            await freshCase();
            await seedAdmin("target");
            await seedAdmin("alternative");
            if (reason === "banned") {
                await db.user.update({ where: { id: "alternative" }, data: { banned: true } });
            } else if (reason === "erased") {
                await db.user.update({ where: { id: "alternative" }, data: { erasedAt: new Date() } });
            } else if (reason === "deletion timestamp") {
                await db.user.update({ where: { id: "alternative" }, data: { deletionRequestedAt: new Date() } });
            } else if (reason.startsWith("pending ")) {
                await db.accountDeletionRequest.create({
                    data: {
                        userId: "alternative", requestedById: "alternative", requestedVia: "SELF",
                        status: reason.slice("pending ".length) as "ACCEPTED" | "PROCESSING" | "BLOCKED",
                    },
                });
            } else {
                await store.recordDeletionIntent({ subjectId: "alternative", requestedVia: "SELF", emailHmac: null });
                await store.markJournalStatus("alternative", reason.slice("journal ".length) as "ACCEPTED" | "BLOCKED" | "COMPLETED");
            }
            await assert.rejects(() => request("target"), service.DeletionRefusedError);
            assert.equal(await db.accountDeletionRequest.count({ where: { userId: "target" } }), 0);
            assert.equal(await store.readJournalEntry("target"), null);
            const target = await db.user.findUniqueOrThrow({ where: { id: "target" } });
            assert.equal(target.banned, false);
            assert.equal(target.deletionRequestedAt, null);
            passed(`only alternative is ${reason}: target deletion is refused without app mutation or intent`);
        }

        for (const banned of [false, null]) {
            await freshCase();
            await seedAdmin("target");
            await seedAdmin("alternative", banned);
            assert.equal((await request("target")).status, "COMPLETED");
            assert.equal(await db.accountDeletionRequest.count({ where: { userId: "target" } }), 1);
            passed(`active alternative with banned=${String(banned)} allows acceptance`);
        }
        console.log(`Acceptance integration: ${results.length}/${results.length} checks passed; no external notifications or services used.`);
    } finally {
        service.__setDbForTests(undefined);
        store.__setErasurePoolForTests(undefined);
        await Promise.allSettled([db.$disconnect(), store.closeErasureStore(), appPool.end(), storePool.end()]);
    }
}

main().catch((error: unknown) => {
    console.error("Acceptance integration failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});

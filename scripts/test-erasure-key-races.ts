/**
 * Isolated PostgreSQL key-lifecycle regressions, with real session lock queues.
 *
 * Run against a DISPOSABLE local PostgreSQL server, for example:
 *   npx tsx scripts/test-erasure-key-races.ts --port=55479 --user=erasure_race_test
 *
 * No dotenv files or application credentials are loaded. Only IPv4 loopback
 * is used, the ordinary PostgreSQL port is refused, and every run creates a
 * new randomly suffixed *_test database (never reuses or drops a database).
 * The database is intentionally left available for inspection after the run.
 * PostgreSQL 14+ and a local role allowed to CREATE DATABASE are required.
 */

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

function settle<T>(promise: Promise<T>): Promise<Outcome<T>> {
    return promise.then((value) => ({ ok: true, value }), (error: unknown) => ({ ok: false, error }));
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    if (args.some((arg) => !/^--(port|user)=/.test(arg))) {
        throw new Error("Only --port=<disposable-local-port> and --user=<local-test-role> are accepted");
    }
    const port = Number(args.find((arg) => arg.startsWith("--port="))?.slice(7) ?? "55479");
    const user = args.find((arg) => arg.startsWith("--user="))?.slice(7) ?? "erasure_race_test";
    assert(Number.isInteger(port) && port > 1024 && port <= 65535 && port !== 5432, "Use a nonstandard disposable local PostgreSQL port");
    assert(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(user), "Use an explicit local test role name");

    const database = `erasure_key_races_${Date.now()}_${randomUUID().slice(0, 8)}_test`;
    assert(/^[a-z0-9_]+_test$/.test(database) && database.length <= 63);
    const baseUrl = `postgresql://${user}:local-test-only@127.0.0.1:${port}`;
    const storeUrl = `${baseUrl}/${database}`;
    const appName = `key-races-${randomUUID()}`;
    const admin = new Pool({ connectionString: `${baseUrl}/postgres`, max: 1, connectionTimeoutMillis: 3000 });
    const keyPool = new Pool({
        connectionString: storeUrl, application_name: appName, max: 4,
        connectionTimeoutMillis: 3000, statement_timeout: 15000,
    });
    const observer = new Pool({
        connectionString: storeUrl, application_name: "key-races-observer", max: 2,
        connectionTimeoutMillis: 3000, statement_timeout: 15000,
    });
    let resetPool: (() => void) | undefined;
    try {
        await admin.query(`CREATE DATABASE "${database}"`);
        await observer.query(await readFile(new URL("./sql/erasure-store.sql", import.meta.url), "utf8"));

        // Set only synthetic local values; never inspect or log inherited secrets.
        process.env.DATABASE_URL = `${baseUrl}/unused_application_test`;
        process.env.DIRECT_URL = process.env.DATABASE_URL;
        process.env.ERASURE_STORE_URL = storeUrl;
        process.env.ERASURE_KEK = randomBytes(32).toString("base64");
        process.env.ERASURE_KEK_ID = "local-race-test";
        delete process.env.ERASURE_KEK_PREVIOUS;
        delete process.env.ERASURE_HMAC_KEY;
        const store = await import("../src/lib/erasure/store");
        const keys = await import("../src/lib/erasure/keys");
        const fields = await import("../src/lib/erasure/fields");

        // Prove the helper overrides a pool/session's stronger default snapshot.
        const clients = await Promise.all(Array.from({ length: 4 }, () => keyPool.connect()));
        try {
            await Promise.all(clients.map((client) => client.query("SET SESSION default_transaction_isolation = 'repeatable read'")));
        } finally {
            clients.forEach((client) => client.release());
        }
        store.__setErasurePoolForTests(keyPool);
        resetPool = () => store.__setErasurePoolForTests(undefined);

        const intent = (subjectId: string) => store.recordDeletionIntent({
            subjectId, emailHmac: null, requestedVia: "INTEGRATION_TEST",
        });
        const assertRevoked = async (subjectId: string) => {
            await assert.rejects(keys.getOrCreateSubjectKey(subjectId), (error: unknown) =>
                error instanceof store.SubjectKeyRevokedError &&
                error.code === "SUBJECT_KEY_REVOKED" && error.subjectId === subjectId
            );
        };

        async function waitForBlockedSessions(count: number): Promise<void> {
            const deadline = Date.now() + 8000;
            while (Date.now() < deadline) {
                const result = await observer.query(
                    `SELECT count(*)::int AS count FROM pg_stat_activity
                      WHERE datname = current_database() AND application_name = $1
                        AND wait_event_type = 'Lock' AND wait_event = 'advisory'`,
                    [appName]
                );
                if (result.rows[0].count === count) return;
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
            throw new Error(`Expected ${count} store sessions queued on the subject advisory lock`);
        }

        /**
         * A third session holds the subject lock so both real store operations
         * are demonstrably in flight before either can proceed. Observing each
         * waiter (rather than relying on sleeps) fixes their queue order.
         */
        async function queuedRace<A, B>(
            subjectId: string, first: () => Promise<A>, second: () => Promise<B>
        ): Promise<[Outcome<A>, Outcome<B>]> {
            const gate = await observer.connect();
            const pending: Promise<unknown>[] = [];
            try {
                await gate.query("BEGIN ISOLATION LEVEL READ COMMITTED");
                await gate.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`erasure-subject:${subjectId}`]);
                const firstResult = settle(first());
                pending.push(firstResult);
                await waitForBlockedSessions(1);
                const secondResult = settle(second());
                pending.push(secondResult);
                await waitForBlockedSessions(2);
                // Independent subjects are not blocked by the held lock.
                await keys.getOrCreateSubjectKey(`test-independent-${randomUUID()}`);
                await gate.query("COMMIT");
                return await Promise.all([firstResult, secondResult]);
            } finally {
                try {
                    await gate.query("ROLLBACK");
                } finally {
                    gate.release();
                }
                await Promise.allSettled(pending);
            }
        }

        function isRevoked(result: Outcome<unknown>): boolean {
            return !result.ok && result.error instanceof store.SubjectKeyRevokedError;
        }

        const firstKeys = await Promise.all(Array.from({ length: 24 }, () => keys.getOrCreateSubjectKey("test-first-write")));
        assert(firstKeys.every((key) => key.dek.equals(firstKeys[0].dek)));
        assert.notEqual(firstKeys[0].dek, firstKeys[1].dek);
        const count = await observer.query('SELECT count(*)::int AS count FROM "erasure_subject_key" WHERE "subjectId" = $1', ["test-first-write"]);
        assert.equal(count.rows[0].count, 1);
        console.log("PASS: concurrent first writes converge on one stored DEK");

        for (const status of ["ACCEPTED", "BLOCKED", "COMPLETED"] as const) {
            for (const hasKey of [false, true]) {
                const subjectId = `test-intent-${status}-${hasKey}`;
                if (hasKey) await keys.getOrCreateSubjectKey(subjectId);
                await intent(subjectId);
                await store.markJournalStatus(subjectId, status);
                await assertRevoked(subjectId);
                assert.equal(Boolean(await keys.getSubjectKey(subjectId)), hasKey);
            }
        }
        console.log("PASS: all journal statuses deny new and existing write keys, but preserve retention reads");

        const retained = await fields.sealProjectFormData("test-retention", { title: "Retained" });
        await intent("test-retention");
        const transferred = await fields.rekeyProjectFormData(retained, keys.INSTITUTION_SUBJECT);
        await keys.destroySubjectKey("test-retention");
        assert.deepEqual(await fields.openProjectFormData(transferred), { data: { title: "Retained" }, erased: false });
        assert.deepEqual(await fields.openProjectFormData(retained), { data: null, erased: true });
        await assert.rejects(store.deleteSubjectKey(keys.INSTITUTION_SUBJECT), /institutional/);
        await assert.rejects(intent(keys.INSTITUTION_SUBJECT), /institutional/);
        assert(await keys.getSubjectKey(keys.INSTITUTION_SUBJECT));
        console.log("PASS: accepted-subject retention transfer succeeds and the institutional key is protected");

        const warmed = await fields.sealFileData("test-remote-delete", "secret test data");
        assert.equal(await fields.openFileData(warmed), "secret test data");
        const returnedKey = await keys.getSubjectKey("test-remote-delete");
        // Direct store destruction does not call any keys.ts invalidation helper.
        assert.equal(await store.deleteSubjectKey("test-remote-delete"), true);
        assert.equal(await keys.getSubjectKey("test-remote-delete"), null);
        await assert.rejects(fields.openFileData(warmed), fields.ErasedDataError);
        await assertRevoked("test-remote-delete");
        assert.equal(returnedKey?.dek.length, 32); // Already-returned bytes are not revocable.
        const tombstone = await store.readJournalEntry("test-remote-delete");
        assert.equal(tombstone?.requestedVia, "KEY_DESTRUCTION");
        await store.markJournalKeyDestroyed("test-remote-delete");
        await store.markJournalStatus("test-remote-delete", "COMPLETED", { fixture: true });
        const completed = await store.readJournalEntry("test-remote-delete");
        assert.equal(await store.deleteSubjectKey("test-remote-delete"), false);
        await intent("test-remote-delete");
        assert.deepEqual(await store.readJournalEntry("test-remote-delete"), completed);
        assert.equal(await store.deleteSubjectKey("test-never-created"), false);
        await assertRevoked("test-never-created");
        console.log("PASS: direct destruction revokes warmed reads and future creation, preserving completed journals on retries");

        for (const mark of [
            () => store.markJournalKeyDestroyed("test-missing"),
            () => store.markJournalStatus("test-missing", "COMPLETED"),
            () => store.markJournalReconciled("test-missing"),
        ]) {
            await assert.rejects(mark(), /Journal entry.*missing/);
        }
        console.log("PASS: missing journal updates fail closed");

        for (const hasKey of [false, true]) {
            const subjectId = `test-destroy-first-${hasKey}`;
            if (hasKey) await keys.getOrCreateSubjectKey(subjectId);
            const [destroyed, insert] = await queuedRace(
                subjectId, () => store.deleteSubjectKey(subjectId), () => keys.getOrCreateSubjectKey(subjectId)
            );
            assert(destroyed.ok && destroyed.value === hasKey);
            assert(isRevoked(insert), "An insert already in flight must not recreate a key after destruction commits");
            assert.equal(await store.readSubjectKey(subjectId), null);
            assert.equal((await store.readJournalEntry(subjectId))?.requestedVia, "KEY_DESTRUCTION");
        }
        console.log("PASS: queued in-flight inserts cannot resurrect destroyed subjects (existing or absent key)");

        for (const hasKey of [false, true]) {
            const subjectId = `test-accept-first-${hasKey}`;
            if (hasKey) await keys.getOrCreateSubjectKey(subjectId);
            const [accepted, insert] = await queuedRace(
                subjectId, () => intent(subjectId), () => keys.getOrCreateSubjectKey(subjectId)
            );
            assert(accepted.ok);
            assert(isRevoked(insert), "A queued write-key request must see acceptance committed after its BEGIN");
            assert.equal(Boolean(await store.readSubjectKey(subjectId)), hasKey);
        }
        console.log("PASS: queued write-key requests observe acceptance after waiting, despite repeatable-read session defaults");

        const [created, destroyed] = await queuedRace(
            "test-create-first",
            () => keys.getOrCreateSubjectKey("test-create-first"),
            () => store.deleteSubjectKey("test-create-first")
        );
        assert(created.ok);
        assert(destroyed.ok && destroyed.value);
        assert.equal(await keys.getSubjectKey("test-create-first"), null);
        await assertRevoked("test-create-first");
        console.log("PASS: creation ordered before destruction cannot leave a surviving key");
        console.log(`All PostgreSQL key-race checks passed; isolated database retained: ${database}`);
    } finally {
        resetPool?.();
        await Promise.all([keyPool.end(), observer.end(), admin.end()]);
    }
}

main().catch((error: unknown) => {
    console.error("Key-race integration test failed:", error instanceof Error ? error.message : "unknown failure");
    process.exitCode = 1;
});

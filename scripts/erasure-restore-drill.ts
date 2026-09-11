/**
 * End-to-end restore drill for account deletion.
 *
 * Proves, against a real PostgreSQL database, that a deleted account does not
 * come back after a restore from backup:
 *
 *   1. create two synthetic users (A and B) with credentials, sessions,
 *      protocols, a post and an inline file, all sealed under their own keys;
 *   2. take a backup with pg_dump;
 *   3. delete user A through the real deletion service;
 *   4. restore the backup with pg_restore (this resurrects A's rows, exactly
 *      what happens in production after a restore);
 *   5. assert A's protected data is unreadable because the key is gone;
 *   6. run reconciliation and assert A is scrubbed again, B is untouched.
 *
 *   npm run erasure:drill -- --confirm-restore
 *
 * Safety: the script REFUSES to run unless the database name in DATABASE_URL
 * contains "drill", "staging", "test" or "dev", NODE_ENV is not "production",
 * and --confirm-restore is passed. It performs a full pg_restore --clean, so
 * never point it at production.
 */
// Load .env before anything imports the database client (import order matters).
import "dotenv/config";

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { loadErasureConfig } from "@/lib/erasure/config";
import { __setDbForTests, reconcileWithJournal, requestAccountDeletion } from "@/lib/erasure/deletion-service";
import { ErasedDataError, openFileData, openProjectFormData, sealFileData, sealProjectFormData } from "@/lib/erasure/fields";
import { forgetSubjectKey, getOrCreateSubjectKey, getSubjectKey } from "@/lib/erasure/keys";
import { isTombstoneEmail } from "@/lib/erasure/retention-policy";
import { deleteJournalEntryForFixture, deleteSubjectKey, readJournalEntry } from "@/lib/erasure/store";

import { connectionString, hasFlag, run } from "./erasure-lib";

const exec = promisify(execFile);

// The drill owns its database connections so it can close every one of them
// before pg_restore drops and recreates the tables, then reconnect afterwards.
// The deletion service is pointed at the same client through its test seam.
let db: PrismaClient;
function connect(url: string): PrismaClient {
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 4 }), log: ["error"] });
    __setDbForTests(db as never);
    return db;
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(`DRILL FAILED: ${message}`);
}

function pass(message: string): void {
    console.log(`  ok  ${message}`);
}

async function terminateOtherConnections(url: string): Promise<void> {
    const dbName = new URL(url).pathname.replace(/^\//, "");
    await exec("psql", [
        "--dbname", url, "--quiet", "--no-psqlrc", "-c",
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName.replace(/'/g, "''")}' AND pid <> pg_backend_pid();`,
    ]);
}

async function createFixtureUser(id: string, label: string) {
    const email = `${id}@drill.invalid`;
    await db.user.create({
        data: { id, email, name: `Drill ${label}`, emailVerified: true, role: "user", profession: "Investigator", bio: "drill fixture" },
    });
    await db.account.create({
        data: { id: `${id}-cred`, accountId: id, providerId: "credential", userId: id, password: "not-a-real-hash" },
    });
    await db.session.create({
        data: { id: `${id}-session`, token: `${id}-token`, userId: id, expiresAt: new Date(Date.now() + 86_400_000) },
    });
    await getOrCreateSubjectKey(id);

    const submitted = await db.project.create({
        data: {
            trackingCode: `DRILL-${label}-${Date.now()}`,
            title: `Drill protocol ${label}`,
            description: "Restore drill fixture",
            category: "drill",
            status: "SUBMITTED",
            userId: id,
            formData: (await sealProjectFormData(id, { piName: `Drill ${label}`, piEmail: email, secret: `pi-${label}` })) as never,
        },
    });
    const draft = await db.project.create({
        data: {
            trackingCode: `DRILL-${label}-DRAFT-${Date.now()}`,
            title: `Drill draft ${label}`,
            description: "Restore drill draft",
            category: "drill",
            status: "DRAFT",
            userId: id,
        },
    });
    await db.post.create({ data: { userId: id, content: `Hello from ${label}` } });
    const file = await db.file.create({
        data: {
            filename: `${label}.txt`,
            mimeType: "text/plain",
            size: 5,
            type: "document",
            userId: id,
            data: await sealFileData(id, Buffer.from(`hello-${label}`).toString("base64")),
        },
    });
    return { id, email, submittedId: submitted.id, draftId: draft.id, fileId: file.id };
}

async function cleanup(ids: string[]): Promise<void> {
    for (const id of ids) {
        await db.user.deleteMany({ where: { id } });
        await db.accountDeletionRequest.deleteMany({ where: { userId: id } });
        await db.auditLog.deleteMany({ where: { targetId: id } });
        await deleteSubjectKey(id).catch(() => undefined);
        await deleteJournalEntryForFixture(id).catch(() => undefined);
        forgetSubjectKey(id);
    }
}

run(async () => {
    const config = loadErasureConfig();
    const url = connectionString();
    const dbName = new URL(url).pathname.replace(/^\//, "");

    if (process.env.NODE_ENV === "production") throw new Error("Refusing to run the drill with NODE_ENV=production");
    if (!/drill|staging|test|dev/i.test(dbName)) {
        throw new Error(`Refusing to run against database "${dbName}"; the name must contain drill, staging, test or dev`);
    }
    if (!hasFlag("--confirm-restore")) {
        throw new Error("Pass --confirm-restore to acknowledge that this script restores the database from a fresh dump");
    }
    if (!config.storeIsolated) {
        console.warn("WARNING: ERASURE_STORE_URL points at the application database. The restore will also resurrect keys;");
        console.warn("         the drill still checks reconciliation, but production must use a separate store.");
    }

    const stamp = Date.now().toString(36);
    const idA = `drill-a-${stamp}-${randomUUID().slice(0, 8)}`;
    const idB = `drill-b-${stamp}-${randomUUID().slice(0, 8)}`;
    const workDir = await mkdtemp(path.join(tmpdir(), "cnersh-erasure-drill-"));
    const dumpFile = path.join(workDir, "before-deletion.dump");
    connect(url);

    try {
        console.log("1. Creating fixture users A and B");
        const a = await createFixtureUser(idA, "A");
        const b = await createFixtureUser(idB, "B");
        const before = await db.project.findUniqueOrThrow({ where: { id: a.submittedId }, select: { formData: true } });
        assert((await openProjectFormData(before.formData)).data?.secret === "pi-A", "A's form data decrypts before deletion");
        pass("fixtures created and readable");

        console.log("2. Backing up with pg_dump");
        await exec("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpFile, "--dbname", url]);
        pass(`backup written to ${dumpFile}`);

        console.log("3. Deleting user A through the deletion service");
        const outcome = await requestAccountDeletion({ userId: a.id, actorId: b.id, via: "ADMIN", reason: "restore drill" });
        assert(outcome.status === "COMPLETED", `deletion completed (got ${outcome.status}: ${outcome.lastError ?? ""})`);
        const afterDelete = await db.user.findUniqueOrThrow({ where: { id: a.id } });
        assert(afterDelete.erasedAt && isTombstoneEmail(afterDelete.email), "A is a tombstone");
        assert((await db.session.count({ where: { userId: a.id } })) === 0, "A has no sessions");
        assert((await db.project.count({ where: { id: a.draftId } })) === 0, "A's draft protocol deleted");
        assert((await db.file.count({ where: { id: a.fileId } })) === 0, "A's inline file deleted");
        assert((await getSubjectKey(a.id)) === null, "A's key destroyed");
        const retained = await db.project.findUniqueOrThrow({ where: { id: a.submittedId }, select: { formData: true } });
        const retainedOpened = await openProjectFormData(retained.formData);
        assert(retainedOpened.data?.secret === "pi-A", "retained protocol re-keyed to the institutional key and still readable");
        pass("deletion verified");

        console.log("4. Restoring the backup (simulating disaster recovery)");
        await db.$disconnect();
        forgetSubjectKey();
        await terminateOtherConnections(url);
        await exec("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--dbname", url, dumpFile]).catch((error: { stderr?: string }) => {
            // pg_restore reports harmless "does not exist" notices as warnings on stderr.
            if (!/errors ignored on restore|WARNING/i.test(error.stderr ?? "")) throw error;
        });
        connect(url);
        pass("database restored to the pre-deletion snapshot");

        console.log("5. Checking the resurrected state");
        const resurrected = await db.user.findUniqueOrThrow({ where: { id: a.id } });
        assert(!resurrected.erasedAt && !isTombstoneEmail(resurrected.email), "restore brought A's profile row back (expected)");
        assert((await db.session.count({ where: { userId: a.id } })) === 1, "restore brought A's session back (expected)");
        const journal = await readJournalEntry(a.id);
        if (config.storeIsolated) {
            assert(journal?.status === "COMPLETED", "journal still records A's deletion");
            assert((await getSubjectKey(a.id)) === null, "A's key is still destroyed after the restore");
            const restoredProject = await db.project.findUniqueOrThrow({ where: { id: a.submittedId }, select: { formData: true } });
            const opened = await openProjectFormData(restoredProject.formData);
            assert(opened.erased && opened.data === null, "A's restored form data is unreadable without the key");
            const restoredFile = await db.file.findUniqueOrThrow({ where: { id: a.fileId }, select: { data: true } });
            let fileUnreadable = false;
            try {
                await openFileData(restoredFile.data ?? "");
            } catch (error) {
                fileUnreadable = error instanceof ErasedDataError;
            }
            assert(fileUnreadable, "A's restored inline file is unreadable without the key");
            pass("protected data stayed unreadable through the restore");
        } else {
            console.warn("  --  key store was restored together with the database; skipping unreadability assertions");
        }

        console.log("6. Running reconciliation (the restore gate)");
        const report = await reconcileWithJournal();
        assert(report.reapplied.includes(a.id) || report.resumed.includes(a.id), "reconciliation re-applied A's deletion");
        assert(report.blocked.length === 0, "reconciliation finished without blocked requests");
        const finalA = await db.user.findUniqueOrThrow({ where: { id: a.id } });
        assert(finalA.erasedAt && isTombstoneEmail(finalA.email) && finalA.banned === true, "A is a tombstone again");
        assert((await db.session.count({ where: { userId: a.id } })) === 0, "A's sessions removed again");
        assert((await db.account.count({ where: { userId: a.id } })) === 0, "A's credentials removed again");
        assert((await db.project.count({ where: { id: a.draftId } })) === 0, "A's draft removed again");
        assert((await db.file.count({ where: { id: a.fileId } })) === 0, "A's inline file removed again");
        assert((await getSubjectKey(a.id)) === null, "A's key remains destroyed");
        const request = await db.accountDeletionRequest.findFirst({ where: { userId: a.id }, orderBy: { createdAt: "desc" } });
        assert(request?.status === "COMPLETED", "a COMPLETED deletion request exists for A");
        const finalRetained = await db.project.findUniqueOrThrow({ where: { id: a.submittedId }, select: { formData: true } });
        const finalOpened = await openProjectFormData(finalRetained.formData);
        assert(
            finalOpened.erased && finalOpened.data === null,
            "A's retained protocol form data is marked erased (its key was destroyed before the restore)"
        );

        const finalB = await db.user.findUniqueOrThrow({ where: { id: b.id } });
        assert(finalB.email === b.email && !finalB.erasedAt && finalB.banned !== true, "B untouched");
        assert((await db.session.count({ where: { userId: b.id } })) === 1, "B still has a session");
        const bProject = await db.project.findUniqueOrThrow({ where: { id: b.submittedId }, select: { formData: true } });
        assert((await openProjectFormData(bProject.formData)).data?.secret === "pi-B", "B's data still readable");
        pass("reconciliation restored the erased state and left B intact");

        console.log("\nDRILL PASSED");
        if (!hasFlag("--keep")) await cleanup([a.id, b.id]);
        return 0;
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        if (!hasFlag("--keep")) await cleanup([idA, idB]).catch(() => undefined);
        return 1;
    } finally {
        await rm(workDir, { recursive: true, force: true });
        await db.$disconnect().catch(() => undefined);
        __setDbForTests(undefined);
    }
});

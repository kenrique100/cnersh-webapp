/**
 * Key lifecycle and field sealing against an in-memory stand-in for the key
 * store, plus transaction-protocol tests of the real store. Subsequent reads
 * cannot recover sealed values after destruction; already-returned bytes are
 * explicitly out of scope. Plaintext (pre-migration) values still open.
 */
import { randomBytes } from "node:crypto";
import type { Pool } from "pg";

jest.mock("@/lib/erasure/store", () => {
    const { INSTITUTION_SUBJECT, SubjectKeyRevokedError } = jest.requireActual("@/lib/erasure/store");
    const rows = new Map<string, Record<string, unknown>>();
    const revoked = new Set<string>();
    return {
        INSTITUTION_SUBJECT,
        SubjectKeyRevokedError,
        __rows: rows,
        __revoked: revoked,
        readSubjectKey: jest.fn(async (subjectId: string) => rows.get(subjectId) ?? null),
        insertSubjectKeyIfAbsent: jest.fn(async (record: Record<string, unknown>) => {
            const id = record.subjectId as string;
            if (revoked.has(id)) throw new SubjectKeyRevokedError(id);
            if (!rows.has(id)) rows.set(id, { ...record, keyVersion: 1, createdAt: new Date(), rotatedAt: null });
            return rows.get(id);
        }),
        updateSubjectKeyWrapping: jest.fn(async (subjectId: string, kekId: string, wrappedDek: Buffer) => {
            const row = rows.get(subjectId);
            if (row) rows.set(subjectId, { ...row, kekId, wrappedDek, rotatedAt: new Date() });
        }),
        deleteSubjectKey: jest.fn(async (subjectId: string) => {
            if (subjectId === INSTITUTION_SUBJECT) throw new Error("Refusing to destroy the institutional records key");
            revoked.add(subjectId);
            return rows.delete(subjectId);
        }),
        recordDeletionIntent: jest.fn(async ({ subjectId }: { subjectId: string }) => {
            revoked.add(subjectId);
            return { subjectId, status: "ACCEPTED" };
        }),
        listSubjectKeys: jest.fn(async (limit = 1000, after?: string) =>
            [...rows.values()]
                .sort((a, b) => String(a.subjectId).localeCompare(String(b.subjectId)))
                .filter((row) => (after ? String(row.subjectId) > after : true))
                .slice(0, limit)
        ),
    };
});

import * as storeModule from "@/lib/erasure/store";
import { ErasedDataError, isErasedFormData, openFileData, openProjectFormData, openString, rekeyProjectFormData, sealFileData, sealProjectFormData, sealString } from "@/lib/erasure/fields";
import { destroySubjectKey, forgetSubjectKey, getOrCreateSubjectKey, getSubjectKey, INSTITUTION_SUBJECT, rewrapAllSubjectKeys, SubjectKeyRevokedError, verifySubjectKeyDestroyed } from "@/lib/erasure/keys";
import { isEncryptedValue } from "@/lib/erasure/crypto";

const rows = (storeModule as unknown as { __rows: Map<string, Record<string, unknown>> }).__rows;
const revoked = (storeModule as unknown as { __revoked: Set<string> }).__revoked;
const KEK_1 = randomBytes(32).toString("base64");
const KEK_2 = randomBytes(32).toString("base64");

describe("subject keys and sealed fields", () => {
    beforeEach(() => {
        rows.clear();
        revoked.clear();
        jest.clearAllMocks();
        forgetSubjectKey();
        process.env.ERASURE_KEK = KEK_1;
        process.env.ERASURE_KEK_ID = "kek-1";
        delete process.env.ERASURE_KEK_PREVIOUS;
        process.env.DATABASE_URL = "postgresql://u:p@h/app";
        process.env.ERASURE_STORE_URL = "postgresql://u:p@h/erasure";
    });

    it("creates one key per subject and reuses it", async () => {
        const first = await getOrCreateSubjectKey("user-1");
        const second = await getOrCreateSubjectKey("user-1");
        expect(second.dek.equals(first.dek)).toBe(true);
        expect(second.dek).not.toBe(first.dek);
        // Neither cached DEKs nor an unguarded existing-key read can grant a write.
        expect(storeModule.insertSubjectKeyIfAbsent).toHaveBeenCalledTimes(2);
        expect(storeModule.readSubjectKey).not.toHaveBeenCalled();
        expect(rows.size).toBe(1);
        expect((await getOrCreateSubjectKey("user-2")).dek.equals(first.dek)).toBe(false);
        expect(await getSubjectKey("nobody")).toBeNull();
    });

    it("seals per subject and opens again; plaintext legacy values pass through", async () => {
        const sealed = await sealString("user-1", "Project", "formData", "secret");
        expect(isEncryptedValue(sealed)).toBe(true);
        expect(await openString("Project", "formData", sealed)).toBe("secret");
        expect(await openString("Project", "formData", "legacy plaintext")).toBe("legacy plaintext");
    });

    it("makes everything sealed under a destroyed key unreadable on subsequent reads", async () => {
        const file = await sealFileData("user-1", Buffer.from("avatar").toString("base64"));
        const form = await sealProjectFormData("user-1", { title: "Study" });
        expect(await openFileData(file)).toBe(Buffer.from("avatar").toString("base64"));
        expect(await openProjectFormData(form)).toEqual({ data: { title: "Study" }, erased: false });

        expect(await destroySubjectKey("user-1")).toBe(true);
        expect(await verifySubjectKeyDestroyed("user-1")).toBe(true);
        expect(await getSubjectKey("user-1")).toBeNull();

        await expect(openFileData(file)).rejects.toBeInstanceOf(ErasedDataError);
        expect(await openProjectFormData(form)).toEqual({ data: null, erased: true });
        // No new key is minted for a destroyed subject by a read.
        expect(rows.has("user-1")).toBe(false);
        await expect(getOrCreateSubjectKey("user-1")).rejects.toBeInstanceOf(SubjectKeyRevokedError);
        await expect(sealFileData("user-1", "new content")).rejects.toMatchObject({
            name: "SubjectKeyRevokedError", code: "SUBJECT_KEY_REVOKED", subjectId: "user-1",
        });
        expect(rows.has("user-1")).toBe(false);
    });

    it("does not serve a warmed DEK after another worker destroys the stored key", async () => {
        const file = await sealFileData("user-remote", "sensitive content");
        expect(await openFileData(file)).toBe("sensitive content");
        const previouslyReturned = await getSubjectKey("user-remote");

        // Bypass keys.ts entirely, as destruction in another worker would.
        await storeModule.deleteSubjectKey("user-remote");
        expect(await getSubjectKey("user-remote")).toBeNull();
        await expect(openFileData(file)).rejects.toBeInstanceOf(ErasedDataError);
        // No promise is made about revoking bytes already handed to callers.
        expect(previouslyReturned?.dek).toHaveLength(32);
    });

    it("does not share mutable DEK buffers between independent reads", async () => {
        const first = await getOrCreateSubjectKey("user-buffers");
        const expected = Buffer.from(first.dek);
        first.dek.fill(0);
        expect((await getSubjectKey("user-buffers"))?.dek.equals(expected)).toBe(true);
    });

    it("converges on the same DEK for concurrent first writes", async () => {
        const keys = await Promise.all(Array.from({ length: 20 }, () => getOrCreateSubjectKey("user-concurrent")));
        expect(keys.every((key) => key.dek.equals(keys[0].dek))).toBe(true);
        expect(rows.size).toBe(1);
        expect(storeModule.insertSubjectKeyIfAbsent).toHaveBeenCalledTimes(20);
    });

    it.each([false, true])("denies accepted-subject writes even with an existing key: %s", async (hasKey) => {
        const subjectId = "user-accepted";
        const sealed = hasKey ? await sealFileData(subjectId, "retained content") : null;
        const sealedForm = hasKey ? await sealProjectFormData(subjectId, { title: "Retained" }) : null;
        await storeModule.recordDeletionIntent({ subjectId, emailHmac: null, requestedVia: "SELF_SERVICE" });
        await expect(getOrCreateSubjectKey(subjectId)).rejects.toBeInstanceOf(SubjectKeyRevokedError);
        await expect(sealFileData(subjectId, "new content")).rejects.toBeInstanceOf(SubjectKeyRevokedError);
        expect(rows.has(subjectId)).toBe(hasKey);

        if (sealed) {
            // Retention needs reads between durable acceptance and destruction.
            expect(await openFileData(sealed)).toBe("retained content");
            const form = await rekeyProjectFormData(sealedForm, INSTITUTION_SUBJECT);
            await destroySubjectKey(subjectId);
            expect(await openProjectFormData(form)).toEqual({ data: { title: "Retained" }, erased: false });
        }
    });

    it("revokes even a subject that has never had a key", async () => {
        expect(await destroySubjectKey("user-no-key")).toBe(false);
        await expect(getOrCreateSubjectKey("user-no-key")).rejects.toBeInstanceOf(SubjectKeyRevokedError);
    });

    it("refuses institutional key destruction", async () => {
        await getOrCreateSubjectKey(INSTITUTION_SUBJECT);
        await expect(destroySubjectKey(INSTITUTION_SUBJECT)).rejects.toThrow(/institutional/);
        expect(storeModule.deleteSubjectKey).not.toHaveBeenCalled();
        expect(await getSubjectKey(INSTITUTION_SUBJECT)).not.toBeNull();
    });

    it("re-keys retained records to the institutional subject and survives the owner's key destruction", async () => {
        const form = await sealProjectFormData("user-1", { title: "Retained" });
        const rekeyed = await rekeyProjectFormData(form, INSTITUTION_SUBJECT);
        await destroySubjectKey("user-1");
        expect(await openProjectFormData(rekeyed)).toEqual({ data: { title: "Retained" }, erased: false });
        expect(await openProjectFormData(form)).toEqual({ data: null, erased: true });
    });

    it("replaces an undecryptable payload with an erased marker instead of failing the rekey", async () => {
        const form = await sealProjectFormData("user-1", { title: "Resurrected" });
        await destroySubjectKey("user-1");
        const result = await rekeyProjectFormData(form, INSTITUTION_SUBJECT);
        expect(isErasedFormData(result)).toBe(true);
        expect(await openProjectFormData(result)).toEqual({ data: null, erased: true });
        expect(await rekeyProjectFormData(result, INSTITUTION_SUBJECT)).toBe(result);
    });

    it("seals legacy plaintext form data when re-keying", async () => {
        const result = await rekeyProjectFormData({ title: "Legacy" }, INSTITUTION_SUBJECT);
        expect(await openProjectFormData(result)).toEqual({ data: { title: "Legacy" }, erased: false });
        expect(await rekeyProjectFormData(null, INSTITUTION_SUBJECT)).toBeNull();
    });

    it("rotates the KEK without changing subject keys or losing data", async () => {
        const sealed = await sealString("user-1", "Project", "formData", "before rotation");
        process.env.ERASURE_KEK = KEK_2;
        process.env.ERASURE_KEK_ID = "kek-2";
        process.env.ERASURE_KEK_PREVIOUS = `kek-1:${KEK_1}`;
        forgetSubjectKey();

        expect(await rewrapAllSubjectKeys()).toBe(1);
        expect(rows.get("user-1")?.kekId).toBe("kek-2");
        delete process.env.ERASURE_KEK_PREVIOUS;
        forgetSubjectKey();
        expect(await openString("Project", "formData", sealed)).toBe("before rotation");
    });

    it("fails closed when the KEK is unknown for a stored key", async () => {
        await sealString("user-1", "Project", "formData", "x");
        process.env.ERASURE_KEK = KEK_2;
        process.env.ERASURE_KEK_ID = "kek-9";
        forgetSubjectKey();
        await expect(getSubjectKey("user-1")).rejects.toThrow(/kek-1/);
    });
});

describe("real store transaction protocol (checked-out connection)", () => {
    const store = jest.requireActual<typeof import("@/lib/erasure/store")>("@/lib/erasure/store");
    type Result = { rows: Record<string, unknown>[]; rowCount: number | null };
    type Query = (sql: string, values?: unknown[]) => Promise<Result>;
    const empty: Result = { rows: [], rowCount: 0 };
    const keyRow = {
        subjectId: "test-store", keyVersion: 1, kekId: "test-kek", wrappedDek: Buffer.alloc(32),
        createdAt: new Date(), rotatedAt: null,
    };
    const journalRow = {
        id: "test-journal", subjectId: "test-store", emailHmac: null, status: "ACCEPTED",
        requestedVia: "SELF_SERVICE", requestedAt: new Date(),
    };
    const keyInput = { subjectId: keyRow.subjectId, kekId: keyRow.kekId, wrappedDek: keyRow.wrappedDek };
    const intent = { subjectId: keyRow.subjectId, emailHmac: null, requestedVia: "SELF_SERVICE" };
    let query: jest.Mock<ReturnType<Query>, Parameters<Query>>;
    let release: jest.Mock;
    let poolQuery: jest.Mock<ReturnType<Query>, Parameters<Query>>;
    let connect: jest.Mock;
    let end: jest.Mock;

    beforeEach(() => {
        query = jest.fn<ReturnType<Query>, Parameters<Query>>().mockResolvedValue(empty);
        release = jest.fn();
        poolQuery = jest.fn<ReturnType<Query>, Parameters<Query>>().mockResolvedValue(empty);
        connect = jest.fn().mockResolvedValue({ query, release });
        end = jest.fn().mockResolvedValue(undefined);
        store.__setErasurePoolForTests({ query: poolQuery, connect, end } as unknown as Pool);
    });

    afterEach(() => {
        store.__setErasurePoolForTests(undefined);
    });

    function expectTransaction() {
        expect(connect).toHaveBeenCalledTimes(1);
        expect(query.mock.calls[0]).toEqual(["BEGIN ISOLATION LEVEL READ COMMITTED"]);
        expect(query.mock.calls[1]).toEqual([
            "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", ["erasure-subject:test-store"],
        ]);
        expect(poolQuery).not.toHaveBeenCalled();
        expect(release).toHaveBeenCalledTimes(1);
    }

    it("uses the injected pool without requiring a matching configured URL", async () => {
        poolQuery.mockResolvedValueOnce({ rows: [{ ok: 1 }], rowCount: 1 });
        expect(await store.pingErasureStore()).toBe(true);
        expect(poolQuery).toHaveBeenCalledWith("SELECT 1 AS ok");
        await store.closeErasureStore();
        expect(end).toHaveBeenCalledTimes(1);
    });

    it("checks tombstones before inserting and commits before returning", async () => {
        query.mockResolvedValueOnce(empty).mockResolvedValueOnce(empty).mockResolvedValueOnce(empty)
            .mockResolvedValueOnce({ rows: [keyRow], rowCount: 1 });
        expect(await store.insertSubjectKeyIfAbsent(keyInput)).toMatchObject(keyRow);
        expectTransaction();
        expect(query.mock.calls[2][0]).toContain('FROM "erasure_journal"');
        expect(query.mock.calls[3][0]).toContain('INSERT INTO "erasure_subject_key"');
        expect(query.mock.calls[4]).toEqual(["COMMIT"]);
    });

    it("reads the winning key on the same transaction connection after conflict", async () => {
        query.mockResolvedValueOnce(empty).mockResolvedValueOnce(empty).mockResolvedValueOnce(empty)
            .mockResolvedValueOnce(empty).mockResolvedValueOnce({ rows: [keyRow], rowCount: 1 });
        expect(await store.insertSubjectKeyIfAbsent(keyInput)).toMatchObject(keyRow);
        expectTransaction();
        expect(query.mock.calls[4][0]).toContain('FROM "erasure_subject_key"');
        expect(query.mock.calls[5]).toEqual(["COMMIT"]);
    });

    it.each(["ACCEPTED", "BLOCKED", "COMPLETED", "FUTURE_STATUS"])("any journal status (%s) denies writes before reading or inserting a key", async (status) => {
        query.mockResolvedValueOnce(empty).mockResolvedValueOnce(empty)
            .mockResolvedValueOnce({ rows: [{ ...journalRow, status }], rowCount: 1 });
        await expect(store.insertSubjectKeyIfAbsent(keyInput)).rejects.toBeInstanceOf(store.SubjectKeyRevokedError);
        expectTransaction();
        expect(query.mock.calls.map(([sql]) => sql).join("\n")).not.toContain('"erasure_subject_key"');
        expect(query.mock.calls[3]).toEqual(["ROLLBACK"]);
    });

    it("accepts deletion under the same subject lock", async () => {
        query.mockResolvedValueOnce(empty).mockResolvedValueOnce(empty)
            .mockResolvedValueOnce({ rows: [journalRow], rowCount: 1 });
        expect(await store.recordDeletionIntent(intent)).toMatchObject(journalRow);
        expectTransaction();
        expect(query.mock.calls[2][0]).toContain('INSERT INTO "erasure_journal"');
        expect(query.mock.calls[3]).toEqual(["COMMIT"]);
    });

    it("reuses a completed journal without overwriting metadata", async () => {
        const completed = { ...journalRow, status: "COMPLETED", completedAt: new Date() };
        query.mockResolvedValueOnce(empty).mockResolvedValueOnce(empty).mockResolvedValueOnce(empty)
            .mockResolvedValueOnce({ rows: [completed], rowCount: 1 });
        expect(await store.recordDeletionIntent(intent)).toMatchObject(completed);
        expectTransaction();
        expect(query.mock.calls[2][0]).toContain('ON CONFLICT ("subjectId") DO NOTHING');
        expect(query.mock.calls[3][0]).toContain('FROM "erasure_journal"');
        expect(query.mock.calls[4]).toEqual(["COMMIT"]);
    });

    it.each([0, 1])("atomically inserts a destruction tombstone before deleting %s keys", async (rowCount) => {
        query.mockResolvedValueOnce(empty).mockResolvedValueOnce(empty)
            .mockResolvedValueOnce({ rows: [journalRow], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount });
        expect(await store.deleteSubjectKey("test-store")).toBe(rowCount === 1);
        expectTransaction();
        expect(query.mock.calls[2][1]).toEqual(["test-store", null, "KEY_DESTRUCTION"]);
        expect(query.mock.calls[3]).toEqual(['DELETE FROM "erasure_subject_key" WHERE "subjectId" = $1', ["test-store"]]);
        expect(query.mock.calls[4]).toEqual(["COMMIT"]);
    });

    it("rejects institutional destruction and revocation before touching the store", async () => {
        await expect(store.deleteSubjectKey(store.INSTITUTION_SUBJECT)).rejects.toThrow(/institutional/);
        await expect(store.recordDeletionIntent({ ...intent, subjectId: store.INSTITUTION_SUBJECT })).rejects.toThrow(/institutional/);
        expect(connect).not.toHaveBeenCalled();
        expect(poolQuery).not.toHaveBeenCalled();
    });

    it.each(["key", "status", "reconciled"])("fails closed if marking journal %s updates no row", async (kind) => {
        const mark = () => kind === "key" ? store.markJournalKeyDestroyed("test-missing")
            : kind === "status" ? store.markJournalStatus("test-missing", "COMPLETED")
                : store.markJournalReconciled("test-missing");
        await expect(mark()).rejects.toThrow(/Journal entry.*missing/);
        poolQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
        await expect(mark()).resolves.toBeUndefined();
    });

    it("does not delete the key if creating its durable tombstone fails", async () => {
        const failure = new Error("journal unavailable");
        query.mockResolvedValueOnce(empty).mockResolvedValueOnce(empty).mockRejectedValueOnce(failure);
        await expect(store.deleteSubjectKey("test-store")).rejects.toBe(failure);
        expectTransaction();
        expect(query.mock.calls[3]).toEqual(["ROLLBACK"]);
        expect(query.mock.calls.some(([sql]) => sql.startsWith("DELETE"))).toBe(false);
    });

    it("rolls back the tombstone if deleting the key fails", async () => {
        const failure = new Error("delete failed");
        query.mockResolvedValueOnce(empty).mockResolvedValueOnce(empty)
            .mockResolvedValueOnce({ rows: [journalRow], rowCount: 1 }).mockRejectedValueOnce(failure);
        await expect(store.deleteSubjectKey("test-store")).rejects.toBe(failure);
        expectTransaction();
        expect(query.mock.calls[4]).toEqual(["ROLLBACK"]);
        expect(release).toHaveBeenCalledWith(undefined);
    });

    it("does not return a key when commit fails", async () => {
        const failure = new Error("commit failed");
        query.mockResolvedValueOnce(empty).mockResolvedValueOnce(empty).mockResolvedValueOnce(empty)
            .mockResolvedValueOnce({ rows: [keyRow], rowCount: 1 }).mockRejectedValueOnce(failure);
        await expect(store.insertSubjectKeyIfAbsent(keyInput)).rejects.toBe(failure);
        expectTransaction();
        expect(query.mock.calls[5]).toEqual(["ROLLBACK"]);
    });

    it("discards a connection when rollback fails while preserving the original error", async () => {
        const failure = new Error("lock failed");
        const rollbackFailure = new Error("connection lost");
        query.mockResolvedValueOnce(empty).mockRejectedValueOnce(failure).mockRejectedValueOnce(rollbackFailure);
        await expect(store.deleteSubjectKey("test-store")).rejects.toBe(failure);
        expect(release).toHaveBeenCalledWith(rollbackFailure);
        expect(release).toHaveBeenCalledTimes(1);
    });

    it("releases a checked-out connection even if BEGIN fails", async () => {
        query.mockRejectedValueOnce(new Error("begin failed"));
        await expect(store.deleteSubjectKey("test-store")).rejects.toThrow("begin failed");
        expect(query.mock.calls[1]).toEqual(["ROLLBACK"]);
        expect(release).toHaveBeenCalledTimes(1);
    });

    it("propagates connection failures without issuing queries", async () => {
        connect.mockRejectedValueOnce(new Error("pool unavailable"));
        await expect(store.deleteSubjectKey("test-store")).rejects.toThrow("pool unavailable");
        expect(query).not.toHaveBeenCalled();
        expect(release).not.toHaveBeenCalled();
    });
});

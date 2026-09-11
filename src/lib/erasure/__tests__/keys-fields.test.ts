/**
 * Key lifecycle and field sealing against an in-memory stand-in for the key
 * store. Verifies that destroying a subject key makes every value sealed under
 * it permanently unreadable, and that plaintext (pre-migration) values still
 * open.
 */
import { randomBytes } from "node:crypto";

jest.mock("@/lib/erasure/store", () => {
    const rows = new Map<string, Record<string, unknown>>();
    return {
        __rows: rows,
        readSubjectKey: jest.fn(async (subjectId: string) => rows.get(subjectId) ?? null),
        insertSubjectKeyIfAbsent: jest.fn(async (record: Record<string, unknown>) => {
            const id = record.subjectId as string;
            if (!rows.has(id)) rows.set(id, { ...record, keyVersion: 1, createdAt: new Date(), rotatedAt: null });
            return rows.get(id);
        }),
        updateSubjectKeyWrapping: jest.fn(async (subjectId: string, kekId: string, wrappedDek: Buffer) => {
            const row = rows.get(subjectId);
            if (row) rows.set(subjectId, { ...row, kekId, wrappedDek, rotatedAt: new Date() });
        }),
        deleteSubjectKey: jest.fn(async (subjectId: string) => rows.delete(subjectId)),
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
import { destroySubjectKey, forgetSubjectKey, getOrCreateSubjectKey, getSubjectKey, INSTITUTION_SUBJECT, rewrapAllSubjectKeys, verifySubjectKeyDestroyed } from "@/lib/erasure/keys";
import { isEncryptedValue } from "@/lib/erasure/crypto";

const rows = (storeModule as unknown as { __rows: Map<string, Record<string, unknown>> }).__rows;
const KEK_1 = randomBytes(32).toString("base64");
const KEK_2 = randomBytes(32).toString("base64");

describe("subject keys and sealed fields", () => {
    beforeEach(() => {
        rows.clear();
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

    it("makes everything sealed under a destroyed key unreadable, even from cache", async () => {
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

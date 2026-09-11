import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { GET as getFile } from "@/app/api/files/[fileId]/route";
import { destroySubjectKey, forgetSubjectKey } from "@/lib/erasure/keys";
import { sealFileData } from "@/lib/erasure/fields";

jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/db", () => ({ db: { file: { findUnique: jest.fn(), delete: jest.fn() } } }));
jest.mock("@/lib/uploadthing", () => ({ utapi: { deleteFiles: jest.fn() } }));
jest.mock("@/lib/erasure/store", () => {
    const { INSTITUTION_SUBJECT, SubjectKeyRevokedError } = jest.requireActual("@/lib/erasure/store");
    const rows = new Map<string, Record<string, unknown>>();
    const revoked = new Set<string>();
    return {
        INSTITUTION_SUBJECT,
        SubjectKeyRevokedError,
        readSubjectKey: jest.fn(async (subjectId: string) => rows.get(subjectId) ?? null),
        insertSubjectKeyIfAbsent: jest.fn(async (record: Record<string, unknown>) => {
            const id = record.subjectId as string;
            if (revoked.has(id)) throw new SubjectKeyRevokedError(id);
            if (!rows.has(id)) rows.set(id, { ...record, keyVersion: 1, createdAt: new Date(), rotatedAt: null });
            return rows.get(id);
        }),
        updateSubjectKeyWrapping: jest.fn(),
        deleteSubjectKey: jest.fn(async (subjectId: string) => {
            if (subjectId === INSTITUTION_SUBJECT) throw new Error("Refusing to destroy the institutional records key");
            revoked.add(subjectId);
            return rows.delete(subjectId);
        }),
        listSubjectKeys: jest.fn(async () => []),
    };
});

const mockedAuthSession = jest.mocked(authSession);
const mockedFindUnique = db.file.findUnique as jest.Mock;

describe("inline file content after erasure", () => {
    beforeAll(() => {
        process.env.ERASURE_KEK = randomBytes(32).toString("base64");
        process.env.DATABASE_URL = "postgresql://u:p@h/app";
        forgetSubjectKey();
    });

    it("serves a sealed file to its owner, then answers 410 once the owner's key is destroyed", async () => {
        const owner = { user: { id: "owner-1", role: "user" } } as unknown as Awaited<ReturnType<typeof authSession>>;
        const sealed = await sealFileData("owner-1", Buffer.from("hello").toString("base64"));
        const row = { data: sealed, url: null, mimeType: "text/plain", filename: "hello.txt", userId: "owner-1" };

        mockedAuthSession.mockResolvedValue(owner);
        mockedFindUnique.mockResolvedValue(row);

        const before = await getFile({} as NextRequest, { params: Promise.resolve({ fileId: "file-1" }) });
        expect(before.status).toBe(200);

        await destroySubjectKey("owner-1");

        const after = await getFile({} as NextRequest, { params: Promise.resolve({ fileId: "file-1" }) });
        expect(after.status).toBe(410);
        expect(after.headers.get("cache-control")).toContain("no-store");
    });
});

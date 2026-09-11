/**
 * State-machine tests for the deletion service using an in-memory stand-in for
 * the Prisma client. These cover the fail-closed guarantees the feature relies
 * on: journal before any application write, storage before row deletion,
 * BLOCKED on any failure, idempotent resume, and the super-admin guard.
 */
import { randomBytes } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/db", () => ({ db: {} }));
jest.mock("@/lib/send-notification-email", () => ({ sendNotificationEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/uploadthing", () => ({ utapi: { deleteFiles: jest.fn() } }));

jest.mock("@/lib/erasure/store", () => ({
    recordDeletionIntent: jest.fn(),
    readJournalEntry: jest.fn(),
    markJournalKeyDestroyed: jest.fn().mockResolvedValue(undefined),
    markJournalStatus: jest.fn().mockResolvedValue(undefined),
    markJournalReconciled: jest.fn().mockResolvedValue(undefined),
    listJournalEntries: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/erasure/keys", () => ({
    INSTITUTION_SUBJECT: "institution-records",
    destroySubjectKey: jest.fn(),
    getSubjectKey: jest.fn(),
    verifySubjectKeyDestroyed: jest.fn(),
}));

jest.mock("@/lib/erasure/fields", () => ({
    openProjectFormData: jest.fn(async (value: unknown) => ({ data: value, erased: false })),
    rekeyProjectFormData: jest.fn(async () => ({ __enc: "rekeyed" })),
}));

import * as storeModule from "@/lib/erasure/store";
import * as keysModule from "@/lib/erasure/keys";
import * as fieldsModule from "@/lib/erasure/fields";

const store = storeModule as jest.Mocked<typeof storeModule>;
const keys = keysModule as jest.Mocked<typeof keysModule>;
const fields = fieldsModule as jest.Mocked<typeof fieldsModule>;

import { sendNotificationEmail } from "@/lib/send-notification-email";
import { utapi } from "@/lib/uploadthing";
import {
    __setDbForTests,
    DELETION_STEPS,
    DeletionRefusedError,
    DeletionUnavailableError,
    processDeletionRequest,
    reconcileWithJournal,
    requestAccountDeletion,
} from "@/lib/erasure/deletion-service";

type Row = Record<string, unknown>;
type FakeModel = Record<string, jest.Mock>;

interface FakeState {
    user: Row | null;
    request: Row | null;
    sessions: number;
    accounts: number;
    livePosts: number;
    files: Row[];
    projects: Row[];
    otherSuperAdmins: number;
    keyPresent: boolean;
    auditLog: Row[];
}

function makeState(overrides: Partial<FakeState> = {}): FakeState {
    return {
        user: { id: "user-1", email: "alice@example.org", name: "Alice", role: "user", erasedAt: null, banned: false, image: "x", deletionRequestedAt: null },
        request: null,
        sessions: 2,
        accounts: 1,
        livePosts: 3,
        files: [
            { id: "file-1", type: "avatar", storageKey: "key-1", url: "https://cdn/x" },
            { id: "file-2", type: "document", storageKey: "key-2", url: "https://cdn/doc" },
        ],
        projects: [
            { id: "proj-1", status: "SUBMITTED", document: "file-2", formData: { title: "kept" } },
            { id: "proj-2", status: "DRAFT", document: null, formData: { title: "draft" } },
        ],
        otherSuperAdmins: 0,
        keyPresent: true,
        auditLog: [],
        ...overrides,
    };
}

const count = (n: number) => ({ count: n });

function fakeDb(state: FakeState) {
    const transaction = { active: false, lockHeld: false };
    const db: Record<string, FakeModel | jest.Mock> = {
        user: {
            findUnique: jest.fn(async () => state.user),
            count: jest.fn(async () => state.otherSuperAdmins),
            update: jest.fn(async ({ data }: { data: Row }) => {
                state.user = { ...state.user, ...data };
                return state.user;
            }),
        },
        accountDeletionRequest: {
            findFirst: jest.fn(async () => state.request),
            findUnique: jest.fn(async () => state.request),
            findMany: jest.fn(async () => (state.request ? [state.request] : [])),
            create: jest.fn(async ({ data }: { data: Row }) => {
                if (state.request) throw new Error("Unique constraint failed: AccountDeletionRequest.userId");
                state.request = { id: "req-1", completedSteps: [], attempts: 0, lastError: null, ...data };
                return state.request;
            }),
            update: jest.fn(async ({ data }: { data: Row }) => {
                const next = { ...data } as Row;
                if (typeof next.attempts === "object" && next.attempts) {
                    next.attempts = ((state.request?.attempts as number) ?? 0) + 1;
                }
                state.request = { ...state.request, ...next };
                return state.request;
            }),
        },
        session: {
            deleteMany: jest.fn(async () => { const n = state.sessions; state.sessions = 0; return count(n); }),
            count: jest.fn(async () => state.sessions),
        },
        account: {
            deleteMany: jest.fn(async () => { const n = state.accounts; state.accounts = 0; return count(n); }),
            count: jest.fn(async () => state.accounts),
        },
        verification: { deleteMany: jest.fn(async () => count(0)) },
        post: {
            updateMany: jest.fn(async () => { const n = state.livePosts; state.livePosts = 0; return count(n); }),
            count: jest.fn(async () => state.livePosts),
        },
        comment: { updateMany: jest.fn(async () => count(0)) },
        communityTopic: { updateMany: jest.fn(async () => count(0)) },
        communityReply: { updateMany: jest.fn(async () => count(0)) },
        like: { deleteMany: jest.fn(async () => count(0)) },
        commentLike: { deleteMany: jest.fn(async () => count(0)) },
        communityTopicLike: { deleteMany: jest.fn(async () => count(0)) },
        notification: { deleteMany: jest.fn(async () => count(0)) },
        file: {
            findMany: jest.fn(async () => state.files),
            delete: jest.fn(async ({ where }: { where: { id: string } }) => {
                state.files = state.files.filter((f) => f.id !== where.id);
                return {};
            }),
        },
        project: {
            findMany: jest.fn(async () => state.projects.filter((p) => p.status !== "DRAFT" || state.projects.includes(p))),
            deleteMany: jest.fn(async () => {
                const before = state.projects.length;
                state.projects = state.projects.filter((p) => p.status !== "DRAFT");
                return count(before - state.projects.length);
            }),
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: Row }) => {
                state.projects = state.projects.map((p) => (p.id === where.id ? { ...p, ...data } : p));
                return {};
            }),
            updateMany: jest.fn(async ({ where, data }: {
                where: { id?: string; formData?: { equals: unknown }; assignedToId?: string };
                data: Row;
            }) => {
                let changed = 0;
                state.projects = state.projects.map((project) => {
                    // PostgreSQL JSONB equality is value-based, not reference-based.
                    const matches = where.id !== undefined
                        ? project.id === where.id && isDeepStrictEqual(project.formData, where.formData?.equals)
                        : where.assignedToId !== undefined && project.assignedToId === where.assignedToId;
                    if (!matches) return project;
                    changed += 1;
                    return { ...project, ...data };
                });
                return count(changed);
            }),
            count: jest.fn(async () => state.projects.filter((p) => p.status === "DRAFT").length),
        },
        reviewAssignment: { deleteMany: jest.fn(async () => count(0)) },
        auditLog: { create: jest.fn(async ({ data }: { data: Row }) => { state.auditLog.push(data); return data; }) },
    };
    db.$executeRaw = jest.fn(async (strings: TemplateStringsArray) => {
        expect(transaction.active).toBe(true);
        expect(strings.join("")).toBe("SELECT pg_advisory_xact_lock(716204, 1)");
        transaction.lockHeld = true;
        return 1;
    });
    db.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        transaction.active = true;
        try {
            return await fn(db);
        } finally {
            transaction.lockHeld = false;
            transaction.active = false;
        }
    });
    return Object.assign(db, { transaction }) as Record<string, FakeModel> & {
        $transaction: jest.Mock;
        $executeRaw: jest.Mock;
        transaction: typeof transaction;
    };
}

const mockedUtapi = utapi as jest.Mocked<typeof utapi>;
const mockedNotification = jest.mocked(sendNotificationEmail);

function existingRequest(overrides: Row = {}): Row {
    return {
        id: "req-1",
        userId: "user-1",
        status: "BLOCKED",
        requestedVia: "SELF",
        requestedById: "user-1",
        journalId: "journal-1",
        completedSteps: [],
        completedAt: null,
        attempts: 1,
        lastError: "previous failure",
        ...overrides,
    };
}

function journalEntry(overrides: Row = {}): storeModule.JournalEntry {
    return {
        id: "journal-1",
        subjectId: "user-1",
        status: "ACCEPTED",
        requestedVia: "SELF",
        requestedAt: new Date("2026-01-01T00:00:00.000Z"),
        keyDestroyedAt: null,
        completedAt: null,
        lastReconciledAt: null,
        emailHmac: null,
        details: null,
        ...overrides,
    } as storeModule.JournalEntry;
}

describe("deletion service", () => {
    let state: FakeState;
    let db: ReturnType<typeof fakeDb>;

    beforeAll(() => {
        process.env.ERASURE_KEK = randomBytes(32).toString("base64");
        process.env.ERASURE_HMAC_KEY = randomBytes(32).toString("base64");
        process.env.DATABASE_URL = "postgresql://u:p@h/app";
        process.env.ERASURE_STORE_URL = "postgresql://u:p@h/erasure";
    });

    beforeEach(() => {
        // clearAllMocks retains rejected/default/one-shot implementations.
        // Reset all mocks and install the complete happy-path defaults each time.
        jest.resetAllMocks();
        state = makeState();
        db = fakeDb(state);
        __setDbForTests(db as never);
        store.recordDeletionIntent.mockResolvedValue({ id: "journal-1" } as never);
        store.readJournalEntry.mockResolvedValue(null);
        store.listJournalEntries.mockResolvedValue([]);
        store.markJournalKeyDestroyed.mockResolvedValue(undefined);
        store.markJournalStatus.mockResolvedValue(undefined);
        store.markJournalReconciled.mockResolvedValue(undefined);
        mockedNotification.mockResolvedValue(undefined);
        fields.openProjectFormData.mockImplementation(async (value) => ({ data: value, erased: false }) as never);
        fields.rekeyProjectFormData.mockResolvedValue({ __enc: "rekeyed" } as never);
        keys.destroySubjectKey.mockImplementation(async () => { state.keyPresent = false; return true; });
        keys.verifySubjectKeyDestroyed.mockImplementation(async () => !state.keyPresent);
        keys.getSubjectKey.mockImplementation(async () => (state.keyPresent ? { subjectId: "user-1", keyVersion: 1, dek: Buffer.alloc(32) } : null));
        mockedUtapi.deleteFiles.mockResolvedValue({ success: true, deletedCount: 1 } as never);
    });

    afterAll(() => __setDbForTests(undefined));

    it("refuses to start when the erasure KEK is not configured and touches nothing", async () => {
        const saved = process.env.ERASURE_KEK;
        delete process.env.ERASURE_KEK;
        try {
            await expect(requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" })).rejects.toBeInstanceOf(DeletionUnavailableError);
        } finally {
            process.env.ERASURE_KEK = saved;
        }
        expect(store.recordDeletionIntent).not.toHaveBeenCalled();
        expect(db.$transaction).not.toHaveBeenCalled();
        expect(state.user?.banned).toBe(false);
    });

    it("writes the journal before any application change and fails closed when the journal is unavailable", async () => {
        store.recordDeletionIntent.mockRejectedValue(new Error("store down"));
        await expect(requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" })).rejects.toBeInstanceOf(DeletionUnavailableError);
        // The transaction may lock/read, but no app mutation precedes the journal.
        expect(db.$transaction).toHaveBeenCalledTimes(1);
        expect(db.$executeRaw).toHaveBeenCalledTimes(1);
        expect(db.accountDeletionRequest.create).not.toHaveBeenCalled();
        expect(db.accountDeletionRequest.update).not.toHaveBeenCalled();
        expect(db.user.update).not.toHaveBeenCalled();
        expect(db.session.deleteMany).not.toHaveBeenCalled();
        expect(db.auditLog.create).not.toHaveBeenCalled();
        expect(state.request).toBeNull();
        expect(state.sessions).toBe(2);
        expect(state.user?.banned).toBe(false);
        expect(state.user?.deletionRequestedAt).toBeNull();
        expect(db.transaction.active).toBe(false);
        expect(sendNotificationEmail).not.toHaveBeenCalled();
    });

    it("refuses to delete the last super administrator", async () => {
        state.user = { ...state.user, role: "superadmin" };
        await expect(requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" })).rejects.toBeInstanceOf(DeletionRefusedError);
        expect(store.recordDeletionIntent).not.toHaveBeenCalled();

        state.otherSuperAdmins = 1;
        const outcome = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });
        expect(outcome.status).toBe("COMPLETED");
    });

    it("counts only eligible superadmins and holds the acceptance lock through intent and app creation", async () => {
        state.user = { ...state.user, role: "superadmin" };
        store.listJournalEntries.mockResolvedValue([
            journalEntry({ subjectId: "journal-accepted" }),
            journalEntry({ subjectId: "journal-blocked", status: "BLOCKED" }),
            journalEntry({ subjectId: "journal-completed", status: "COMPLETED" }),
        ]);
        db.user.count.mockImplementation(async () => {
            expect(db.transaction).toEqual({ active: true, lockHeld: true });
            return 1;
        });
        store.recordDeletionIntent.mockImplementation(async () => {
            expect(db.transaction).toEqual({ active: true, lockHeld: true });
            expect(db.accountDeletionRequest.create).not.toHaveBeenCalled();
            expect(db.user.update).not.toHaveBeenCalled();
            return journalEntry();
        });
        const create = db.accountDeletionRequest.create.getMockImplementation()!;
        db.accountDeletionRequest.create.mockImplementation(async (...args: unknown[]) => {
            expect(db.transaction).toEqual({ active: true, lockHeld: true });
            return create(...args);
        });

        await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });

        expect(db.user.count).toHaveBeenCalledWith({
            where: {
                role: "superadmin",
                erasedAt: null,
                deletionRequestedAt: null,
                id: { not: "user-1", notIn: ["journal-accepted", "journal-blocked", "journal-completed"] },
                OR: [{ banned: false }, { banned: null }],
                deletionRequests: { none: { status: { in: ["ACCEPTED", "PROCESSING", "BLOCKED"] } } },
            },
        });
        const ordered = [
            db.$transaction, db.$executeRaw, db.accountDeletionRequest.findFirst, db.user.findUnique,
            store.listJournalEntries, db.user.count, store.recordDeletionIntent,
            db.accountDeletionRequest.create, db.user.update, db.session.deleteMany, db.auditLog.create,
        ].map((mock) => mock.mock.invocationCallOrder[0]);
        expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
        expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
            isolationLevel: "ReadCommitted", maxWait: 10_000, timeout: 30_000,
        });
        expect(db.transaction).toEqual({ active: false, lockHeld: false });
    });

    it("refuses superadmin deletion when durable journal exclusions cannot be read", async () => {
        state.user = { ...state.user, role: "superadmin" };
        state.otherSuperAdmins = 1;
        store.listJournalEntries.mockRejectedValue(new Error("journal unavailable"));

        await expect(requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" }))
            .rejects.toBeInstanceOf(DeletionUnavailableError);

        expect(db.user.count).not.toHaveBeenCalled();
        expect(store.recordDeletionIntent).not.toHaveBeenCalled();
        expect(db.accountDeletionRequest.create).not.toHaveBeenCalled();
        expect(db.user.update).not.toHaveBeenCalled();
        expect(db.session.deleteMany).not.toHaveBeenCalled();
    });

    it("runs every step, keeps protocol evidence, destroys the key and completes", async () => {
        state.projects[0].assignedToId = "user-1";
        const outcome = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF", reason: "leaving" });

        expect(outcome.status).toBe("COMPLETED");
        expect(outcome.completedSteps).toEqual([...DELETION_STEPS]);
        expect(store.recordDeletionIntent).toHaveBeenCalledWith(
            expect.objectContaining({ subjectId: "user-1", requestedVia: "SELF", emailHmac: expect.any(String) })
        );
        // Lock/read transaction starts first; intent precedes every app mutation.
        const journalOrder = store.recordDeletionIntent.mock.invocationCallOrder[0];
        expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(journalOrder);
        for (const mutation of [
            db.accountDeletionRequest.create, db.accountDeletionRequest.update,
            db.user.update, db.session.deleteMany, db.auditLog.create,
        ]) {
            expect(journalOrder).toBeLessThan(mutation.mock.invocationCallOrder[0]);
        }
        // Notice went to the original address before scrubbing.
        expect(sendNotificationEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "alice@example.org", notificationType: "ACCOUNT_DELETION_STARTED" }));
        // Access revoked, content scrubbed.
        expect(state.sessions).toBe(0);
        expect(state.accounts).toBe(0);
        expect(state.livePosts).toBe(0);
        // Avatar deleted from storage then database; the protocol document is retained.
        expect(mockedUtapi.deleteFiles).toHaveBeenCalledTimes(1);
        expect(mockedUtapi.deleteFiles).toHaveBeenCalledWith("key-1");
        expect(state.files.map((f) => f.id)).toEqual(["file-2"]);
        // Draft deleted, submitted protocol re-keyed to the institution.
        expect(state.projects.map((p) => p.id)).toEqual(["proj-1"]);
        expect(state.projects[0].formData).toEqual({ __enc: "rekeyed" });
        expect(state.projects[0].assignedToId).toBeNull();
        // Profile tombstoned and key destroyed, journal updated.
        expect(state.user?.email).toMatch(/@erased\.invalid$/);
        expect(state.user?.banned).toBe(true);
        expect(state.user?.erasedAt).toBeInstanceOf(Date);
        expect(keys.destroySubjectKey).toHaveBeenCalledWith("user-1");
        expect(store.markJournalKeyDestroyed).toHaveBeenCalledWith("user-1");
        expect(store.markJournalStatus).toHaveBeenCalledWith("user-1", "COMPLETED", expect.anything());
        const completeWrite = db.accountDeletionRequest.update.mock.calls.findIndex(([args]) => args.data.status === "COMPLETED");
        expect(store.markJournalStatus.mock.invocationCallOrder[0]).toBeLessThan(db.accountDeletionRequest.update.mock.invocationCallOrder[completeWrite]);
        expect(state.auditLog.map((a) => a.action)).toEqual(["ACCOUNT_DELETION_REQUESTED", "ACCOUNT_ERASURE_COMPLETED"]);
    });

    it("blocks a stale retained-form rekey instead of overwriting concurrent institutional ciphertext, then safely retries", async () => {
        const original = { __enc: "owner-encrypted-protocol" };
        const institutional = { __enc: "institution-encrypted-protocol" };
        const erasedMarker = { __erased: true, erasedAt: "2026-09-11T14:22:00.000Z" };
        state.projects[0].formData = original;
        fields.rekeyProjectFormData
            .mockImplementationOnce(async (value, subjectId) => {
                expect(value).toEqual(original);
                expect(subjectId).toBe(keys.INSTITUTION_SUBJECT);
                // Worker A read the original form. Worker B now wins custody
                // transfer and destroys the source key before A can rekey it.
                state.projects = state.projects.map((project) => project.id === "proj-1"
                    ? { ...project, formData: institutional }
                    : project);
                state.keyPresent = false;
                return erasedMarker;
            })
            .mockImplementationOnce(async (value, subjectId) => {
                // The retry must read the NEW institutional payload, not reuse
                // the stale owner payload or persist the erased-marker result.
                expect(value).toEqual(institutional);
                expect(subjectId).toBe(keys.INSTITUTION_SUBJECT);
                return { ...institutional };
            });

        const blocked = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });

        expect(blocked.status).toBe("BLOCKED");
        expect(blocked.lastError).toMatch(/Retained protocol proj-1 changed during re-keying; retry required/);
        expect(blocked.completedSteps).toEqual(["revoke", "content", "files"]);
        expect(state.projects[0].formData).toEqual(institutional);
        expect(state.user?.erasedAt).toBeNull();
        expect(keys.destroySubjectKey).not.toHaveBeenCalled();
        expect(store.markJournalStatus).not.toHaveBeenCalledWith("user-1", "COMPLETED", expect.anything());
        expect(db.project.update).not.toHaveBeenCalled();
        expect(db.project.updateMany).toHaveBeenNthCalledWith(1, {
            where: { id: "proj-1", formData: { equals: original } },
            data: { formData: erasedMarker },
        });

        const retried = await processDeletionRequest("req-1");

        expect(retried.status).toBe("COMPLETED");
        expect(retried.completedSteps).toEqual([...DELETION_STEPS]);
        expect(fields.rekeyProjectFormData).toHaveBeenCalledTimes(2);
        expect(db.project.updateMany).toHaveBeenNthCalledWith(2, {
            where: { id: "proj-1", formData: { equals: institutional } },
            data: { formData: institutional },
        });
        expect(state.projects[0].formData).toEqual(institutional);
        expect(state.projects[0].formData).not.toEqual(erasedMarker);
        expect(keys.destroySubjectKey).toHaveBeenCalledTimes(1);
        expect(state.request?.attempts).toBe(2);
    });

    it("blocks when the storage provider does not confirm deletion, keeps the row, and resumes later", async () => {
        mockedUtapi.deleteFiles.mockResolvedValueOnce({ success: false, deletedCount: 0 } as never);

        const blocked = await requestAccountDeletion({ userId: "user-1", actorId: "admin-1", via: "ADMIN" });
        expect(blocked.status).toBe("BLOCKED");
        expect(blocked.lastError).toMatch(/Storage provider did not confirm/);
        expect(blocked.completedSteps).toEqual(["revoke", "content"]);
        expect(db.file.delete).not.toHaveBeenCalled();
        expect(state.files).toHaveLength(2);
        expect(keys.destroySubjectKey).not.toHaveBeenCalled();
        expect(state.user?.email).toBe("alice@example.org");
        expect(store.markJournalStatus).toHaveBeenCalledWith("user-1", "BLOCKED", expect.anything());

        // Retry: already-completed steps are skipped, the rest run, verify re-runs.
        mockedUtapi.deleteFiles.mockResolvedValue({ success: true, deletedCount: 1 } as never);
        const revokeCallsBeforeResume = (db.session.deleteMany as jest.Mock).mock.calls.length;
        const resumed = await processDeletionRequest("req-1");
        expect(resumed.status).toBe("COMPLETED");
        // The completed "revoke" step is not repeated on resume.
        expect(db.session.deleteMany).toHaveBeenCalledTimes(revokeCallsBeforeResume);
        expect(state.user?.erasedAt).toBeInstanceOf(Date);
        expect(state.keyPresent).toBe(false);
    });

    it("blocks instead of completing when key destruction cannot be verified", async () => {
        keys.verifySubjectKeyDestroyed.mockResolvedValue(false);
        const outcome = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });
        expect(outcome.status).toBe("BLOCKED");
        expect(outcome.lastError).toMatch(/Key destruction could not be verified/);
        expect(store.markJournalKeyDestroyed).not.toHaveBeenCalled();
    });

    it("resumes a BLOCKED request after erasedAt is set rather than reporting premature completion", async () => {
        keys.verifySubjectKeyDestroyed.mockResolvedValueOnce(false);
        const blocked = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });
        expect(blocked.status).toBe("BLOCKED");
        expect(blocked.completedSteps).toEqual(["revoke", "content", "files", "protocols", "profile"]);
        expect(state.user?.erasedAt).toBeInstanceOf(Date);
        expect(state.request?.completedAt).toBeNull();

        const resumed = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });

        expect(resumed).toMatchObject({ requestId: "req-1", status: "COMPLETED", completedSteps: [...DELETION_STEPS], lastError: null });
        expect(state.request?.attempts).toBe(2);
        expect(keys.destroySubjectKey).toHaveBeenCalledTimes(2);
        expect(keys.verifySubjectKeyDestroyed).toHaveBeenCalledTimes(2);
        expect(db.accountDeletionRequest.create).toHaveBeenCalledTimes(1);
        expect(store.recordDeletionIntent).toHaveBeenCalledTimes(1);
        expect(sendNotificationEmail).toHaveBeenCalledTimes(1);
    });

    it("resumes an existing noncomplete request with no user row and verifies destruction despite saved checkpoints", async () => {
        state.user = null;
        state.sessions = 0;
        state.accounts = 0;
        state.request = existingRequest({ completedSteps: [...DELETION_STEPS] });

        const outcome = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });

        expect(outcome).toMatchObject({ requestId: "req-1", status: "COMPLETED", completedSteps: [...DELETION_STEPS] });
        expect(keys.destroySubjectKey).toHaveBeenCalledWith("user-1");
        expect(keys.verifySubjectKeyDestroyed).toHaveBeenCalledWith("user-1");
        expect(keys.destroySubjectKey.mock.invocationCallOrder[0]).toBeLessThan(keys.verifySubjectKeyDestroyed.mock.invocationCallOrder[0]);
        expect(keys.verifySubjectKeyDestroyed.mock.invocationCallOrder[0]).toBeLessThan(store.markJournalStatus.mock.invocationCallOrder[0]);
        expect(state.keyPresent).toBe(false);
        expect(db.accountDeletionRequest.create).not.toHaveBeenCalled();
        expect(db.user.update).not.toHaveBeenCalled();
        // AuditLog requires an app-user FK; the durable journal records completion.
        expect(db.auditLog.create).not.toHaveBeenCalled();
        expect(store.recordDeletionIntent).not.toHaveBeenCalled();
        expect(sendNotificationEmail).not.toHaveBeenCalled();
    });

    describe.each(["processing", "reconciliation"] as const)("missing-user %s", (path) => {
        it.each(["destroy outage", "verification false"] as const)("stays BLOCKED on %s without a completed or reconciled journal mark", async (failure) => {
            state.user = null;
            state.sessions = 0;
            state.accounts = 0;
            state.request = existingRequest({ completedSteps: [...DELETION_STEPS] });
            store.listJournalEntries.mockResolvedValue([journalEntry({ status: "BLOCKED" })]);
            if (failure === "destroy outage") {
                keys.destroySubjectKey.mockRejectedValue(new Error("key store unavailable"));
            } else {
                keys.verifySubjectKeyDestroyed.mockResolvedValue(false);
            }

            if (path === "processing") {
                const outcome = await processDeletionRequest("req-1");
                expect(outcome.status).toBe("BLOCKED");
                expect(outcome.lastError).toMatch(/key store unavailable|Key destruction could not be verified/);
            } else {
                const report = await reconcileWithJournal();
                expect(report.blocked).toEqual(["user-1"]);
                expect(report.consistent).toBe(0);
                expect(report.reapplied).toEqual([]);
            }

            expect(state.request?.status).toBe("BLOCKED");
            expect(state.request?.completedAt).toBeNull();
            expect(keys.destroySubjectKey).toHaveBeenCalledWith("user-1");
            expect(store.markJournalStatus).toHaveBeenCalledWith("user-1", "BLOCKED", expect.anything());
            expect(store.markJournalStatus).not.toHaveBeenCalledWith("user-1", "COMPLETED", expect.anything());
            expect(store.markJournalKeyDestroyed).not.toHaveBeenCalled();
            expect(store.markJournalReconciled).not.toHaveBeenCalled();
            expect(db.accountDeletionRequest.update).not.toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: "COMPLETED" }),
            }));
        });

        it("does not complete when credentials remain after the user row disappears", async () => {
            state.user = null;
            state.request = existingRequest();
            store.listJournalEntries.mockResolvedValue([journalEntry({ status: "BLOCKED" })]);

            if (path === "processing") {
                expect((await processDeletionRequest("req-1")).status).toBe("BLOCKED");
            } else {
                expect((await reconcileWithJournal()).blocked).toEqual(["user-1"]);
            }
            expect(store.markJournalStatus).not.toHaveBeenCalledWith("user-1", "COMPLETED", expect.anything());
            expect(store.markJournalReconciled).not.toHaveBeenCalled();
        });
    });

    it.each([true, false])("journal completion failure stays BLOCKED instead of completing the app (user present: %s)", async (userPresent) => {
        if (!userPresent) {
            state.user = null;
            state.sessions = 0;
            state.accounts = 0;
            state.request = existingRequest();
        }
        store.markJournalStatus.mockImplementation(async (_subject, status) => {
            if (status === "COMPLETED") throw new Error("journal completion unavailable");
        });

        const outcome = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });

        expect(outcome.status).toBe("BLOCKED");
        expect(outcome.lastError).toMatch(/journal completion unavailable/);
        expect(state.request?.status).toBe("BLOCKED");
        expect(state.request?.completedAt).toBeNull();
        expect(db.accountDeletionRequest.update).not.toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: "COMPLETED" }),
        }));
        expect(state.auditLog.map((row) => row.action)).not.toContain("ACCOUNT_ERASURE_COMPLETED");
        expect(store.markJournalReconciled).not.toHaveBeenCalled();
        expect(store.markJournalStatus).toHaveBeenCalledWith("user-1", "BLOCKED", expect.anything());

        store.markJournalStatus.mockResolvedValue(undefined);
        expect((await processDeletionRequest("req-1")).status).toBe("COMPLETED");
    });

    it("is idempotent: a repeat request for an erased account returns the completed outcome", async () => {
        await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });
        jest.clearAllMocks();

        const again = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });
        expect(again.status).toBe("COMPLETED");
        expect(again.requestId).toBe("req-1");
        expect(store.recordDeletionIntent).not.toHaveBeenCalled();
        expect(sendNotificationEmail).not.toHaveBeenCalled();
        expect(db.accountDeletionRequest.create).not.toHaveBeenCalled();
        expect(keys.destroySubjectKey).not.toHaveBeenCalled();
    });

    it("re-applies erasure after a restore resurrects a journalled user", async () => {
        store.listJournalEntries.mockResolvedValue([
            { id: "journal-1", subjectId: "user-1", status: "COMPLETED", keyDestroyedAt: new Date(), reconciledAt: null, requestedVia: "SELF" },
        ] as never);
        // Restore state: live row again, key already gone for good.
        state.keyPresent = false;
        keys.destroySubjectKey.mockResolvedValue(false);

        const report = await reconcileWithJournal();
        expect(report.checked).toBe(1);
        expect(report.reapplied).toEqual(["user-1"]);
        expect(report.blocked).toEqual([]);
        expect(report.consistent).toBe(0);
        expect(state.user?.email).toMatch(/@erased\.invalid$/);
        expect(state.sessions).toBe(0);
        expect(state.request?.status).toBe("COMPLETED");
        expect(state.request?.requestedVia).toBe("RECONCILIATION");
        expect(store.markJournalReconciled).toHaveBeenCalledWith("user-1");
        expect(sendNotificationEmail).not.toHaveBeenCalled();
    });

    it.each(["COMPLETED", "ACCEPTED", "PROCESSING", "BLOCKED"])("resets a restored live user's stale %s request in the same unique row", async (status) => {
        const oldCompletedAt = new Date("2025-12-01T00:00:00.000Z");
        state.request = existingRequest({ status, completedSteps: [...DELETION_STEPS], completedAt: oldCompletedAt });
        state.keyPresent = false;
        store.listJournalEntries.mockResolvedValue([journalEntry({ status: "COMPLETED", keyDestroyedAt: oldCompletedAt })]);
        keys.destroySubjectKey.mockResolvedValue(false);

        const report = await reconcileWithJournal();

        expect(report).toEqual({ checked: 1, reapplied: ["user-1"], resumed: [], blocked: [], consistent: 0 });
        expect(db.accountDeletionRequest.create).not.toHaveBeenCalled();
        expect(db.accountDeletionRequest.update).toHaveBeenNthCalledWith(1, {
            where: { id: "req-1" },
            data: expect.objectContaining({
                status: "ACCEPTED", requestedVia: "RECONCILIATION", completedSteps: [],
                completedAt: null, lastError: null, journalId: "journal-1",
            }),
        });
        expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(db.accountDeletionRequest.update.mock.invocationCallOrder[0]);
        expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "ReadCommitted" }));
        expect(state.request).toMatchObject({
            id: "req-1", userId: "user-1", status: "COMPLETED", requestedVia: "RECONCILIATION",
            completedSteps: [...DELETION_STEPS], lastError: null,
        });
        expect(state.sessions).toBe(0);
        expect(state.accounts).toBe(0);
        expect(state.livePosts).toBe(0);
        expect(state.user?.email).toMatch(/@erased\.invalid$/);
        expect(state.user?.banned).toBe(true);
        expect(db.post.updateMany).toHaveBeenCalledTimes(1);
        expect(store.markJournalReconciled).toHaveBeenCalledTimes(1);
        expect(sendNotificationEmail).not.toHaveBeenCalled();
    });

    it("does not mark a restored user reconciled when journal completion fails", async () => {
        state.request = existingRequest({ status: "COMPLETED", completedSteps: [...DELETION_STEPS] });
        store.listJournalEntries.mockResolvedValue([journalEntry({ status: "COMPLETED" })]);
        store.markJournalStatus.mockImplementation(async (_subject, status) => {
            if (status === "COMPLETED") throw new Error("journal completion unavailable");
        });

        const report = await reconcileWithJournal();

        expect(report.blocked).toEqual(["user-1"]);
        expect(report.consistent).toBe(0);
        expect(state.request?.status).toBe("BLOCKED");
        expect(state.request?.completedAt).toBeNull();
        expect(db.accountDeletionRequest.create).not.toHaveBeenCalled();
        expect(store.markJournalReconciled).not.toHaveBeenCalled();
        expect(db.accountDeletionRequest.update).not.toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: "COMPLETED" }),
        }));
    });

    it("verifies destruction and completes the existing missing-user request during reconciliation", async () => {
        state.user = null;
        state.sessions = 0;
        state.accounts = 0;
        state.request = existingRequest();
        store.listJournalEntries.mockResolvedValue([journalEntry({ status: "BLOCKED" })]);

        const report = await reconcileWithJournal();

        expect(report).toEqual({ checked: 1, reapplied: ["user-1"], resumed: [], blocked: [], consistent: 0 });
        expect(keys.destroySubjectKey).toHaveBeenCalledWith("user-1");
        expect(keys.verifySubjectKeyDestroyed).toHaveBeenCalledWith("user-1");
        expect(store.markJournalKeyDestroyed).toHaveBeenCalledWith("user-1");
        expect(state.request).toMatchObject({ id: "req-1", status: "COMPLETED", completedSteps: [...DELETION_STEPS] });
        expect(db.accountDeletionRequest.create).not.toHaveBeenCalled();
        expect(store.markJournalReconciled).toHaveBeenCalledWith("user-1");
        const ordered = [
            keys.destroySubjectKey, keys.verifySubjectKeyDestroyed, store.markJournalKeyDestroyed,
            store.markJournalStatus, db.accountDeletionRequest.update, store.markJournalReconciled,
        ].map((mock) => mock.mock.invocationCallOrder[0]);
        expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
    });

    it("keeps missing-user reconciliation BLOCKED when journal completion is unavailable", async () => {
        state.user = null;
        state.sessions = 0;
        state.accounts = 0;
        state.request = existingRequest();
        store.listJournalEntries.mockResolvedValue([journalEntry({ status: "BLOCKED" })]);
        store.markJournalStatus.mockImplementation(async (_subject, status) => {
            if (status === "COMPLETED") throw new Error("journal completion unavailable");
        });

        const report = await reconcileWithJournal();

        expect(report).toEqual({ checked: 1, reapplied: [], resumed: [], blocked: ["user-1"], consistent: 0 });
        expect(state.request?.status).toBe("BLOCKED");
        expect(state.request?.completedAt).toBeNull();
        expect(store.markJournalReconciled).not.toHaveBeenCalled();
        expect(db.accountDeletionRequest.update).not.toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: "COMPLETED" }),
        }));
    });

    it("leaves intact users alone during reconciliation when the journal already matches", async () => {
        state.user = { ...state.user, email: "user-1@erased.invalid", erasedAt: new Date(), banned: true };
        state.sessions = 0;
        state.accounts = 0;
        state.keyPresent = false;
        store.listJournalEntries.mockResolvedValue([
            { id: "journal-1", subjectId: "user-1", status: "COMPLETED", keyDestroyedAt: new Date(), reconciledAt: new Date(), requestedVia: "SELF" },
        ] as never);
        const report = await reconcileWithJournal();
        expect(report.reapplied).toEqual([]);
        expect(report.resumed).toEqual([]);
        expect(db.$transaction).not.toHaveBeenCalled();
    });
});

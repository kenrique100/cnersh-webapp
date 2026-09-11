/**
 * State-machine tests for the deletion service using an in-memory stand-in for
 * the Prisma client. These cover the fail-closed guarantees the feature relies
 * on: journal before any application write, storage before row deletion,
 * BLOCKED on any failure, idempotent resume, and the super-admin guard.
 */
import { randomBytes } from "node:crypto";

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

const store = storeModule as jest.Mocked<typeof storeModule>;
const keys = keysModule as jest.Mocked<typeof keysModule>;

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
            updateMany: jest.fn(async () => count(0)),
            count: jest.fn(async () => state.projects.filter((p) => p.status === "DRAFT").length),
        },
        reviewAssignment: { deleteMany: jest.fn(async () => count(0)) },
        auditLog: { create: jest.fn(async ({ data }: { data: Row }) => { state.auditLog.push(data); return data; }) },
    };
    db.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db));
    return db as Record<string, FakeModel> & { $transaction: jest.Mock };
}

const mockedUtapi = utapi as jest.Mocked<typeof utapi>;

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
        jest.clearAllMocks();
        state = makeState();
        db = fakeDb(state);
        __setDbForTests(db as never);
        store.recordDeletionIntent.mockResolvedValue({ id: "journal-1" } as never);
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
        expect(db.$transaction).not.toHaveBeenCalled();
        expect(state.request).toBeNull();
        expect(state.sessions).toBe(2);
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

    it("runs every step, keeps protocol evidence, destroys the key and completes", async () => {
        const outcome = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF", reason: "leaving" });

        expect(outcome.status).toBe("COMPLETED");
        expect(outcome.completedSteps).toEqual([...DELETION_STEPS]);
        expect(store.recordDeletionIntent).toHaveBeenCalledWith(
            expect.objectContaining({ subjectId: "user-1", requestedVia: "SELF", emailHmac: expect.any(String) })
        );
        // Journal was recorded before the application transaction.
        expect(store.recordDeletionIntent.mock.invocationCallOrder[0]).toBeLessThan((db.$transaction as jest.Mock).mock.invocationCallOrder[0]);
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
        // Profile tombstoned and key destroyed, journal updated.
        expect(state.user?.email).toMatch(/@erased\.invalid$/);
        expect(state.user?.banned).toBe(true);
        expect(state.user?.erasedAt).toBeInstanceOf(Date);
        expect(keys.destroySubjectKey).toHaveBeenCalledWith("user-1");
        expect(store.markJournalKeyDestroyed).toHaveBeenCalledWith("user-1");
        expect(store.markJournalStatus).toHaveBeenCalledWith("user-1", "COMPLETED", expect.anything());
        expect(state.auditLog.map((a) => a.action)).toEqual(["ACCOUNT_DELETION_REQUESTED", "ACCOUNT_ERASURE_COMPLETED"]);
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

    it("is idempotent: a repeat request for an erased account returns the completed outcome", async () => {
        await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });
        jest.clearAllMocks();

        const again = await requestAccountDeletion({ userId: "user-1", actorId: "user-1", via: "SELF" });
        expect(again.status).toBe("COMPLETED");
        expect(store.recordDeletionIntent).not.toHaveBeenCalled();
        expect(sendNotificationEmail).not.toHaveBeenCalled();
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

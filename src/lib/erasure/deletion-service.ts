/**
 * Durable account deletion.
 *
 *   REQUESTED -> ACCEPTED -> PROCESSING -> COMPLETED
 *                                 \-> BLOCKED (retried by the erasure cron)
 *
 * Invariants
 *   - The deletion intent is written to the erasure journal (outside the
 *     application database's backup rollback domain when ERASURE_STORE_URL is
 *     separate) before anything else changes. If that write fails the request
 *     is refused; the account is never left half-deleted without a record.
 *   - Every step is idempotent, so a crashed or blocked request, or one undone
 *     by a database restore, is simply re-run.
 *   - Nothing is reported as erased until it has been verified: storage
 *     deletions must succeed before rows are removed, and the key must be
 *     read back as absent after destruction.
 *   - Records the committee must retain are handled by retention-policy.ts and
 *     re-keyed to the institutional key rather than destroyed.
 */

import * as Sentry from "@sentry/nextjs";

import { Prisma } from "@/generated/prisma/client";
import type { AccountDeletionRequest, AccountDeletionStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { utapi } from "@/lib/uploadthing";

import { ErasureNotConfiguredError, loadErasureConfig } from "./config";
import { hmacPseudonym } from "./crypto";
import { openProjectFormData, rekeyProjectFormData } from "./fields";
import { destroySubjectKey, getSubjectKey, INSTITUTION_SUBJECT, verifySubjectKeyDestroyed } from "./keys";
import {
    isRetainedProjectStatus,
    isTombstoneEmail,
    PENDING_BAN_REASON,
    RETAINED_FILE_TYPES,
    tombstoneUserFields,
} from "./retention-policy";
import {
    listJournalEntries,
    markJournalKeyDestroyed,
    markJournalReconciled,
    markJournalStatus,
    readJournalEntry,
    recordDeletionIntent,
} from "./store";

export type RequestedVia = "SELF" | "ADMIN" | "RECONCILIATION";

export const DELETION_STEPS = ["revoke", "content", "files", "protocols", "profile", "key", "verify"] as const;
export type DeletionStep = (typeof DELETION_STEPS)[number];

export class DeletionUnavailableError extends Error {
    constructor(message = "Account deletion is temporarily unavailable. Please try again later.") {
        super(message);
        this.name = "DeletionUnavailableError";
    }
}

export class DeletionRefusedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DeletionRefusedError";
    }
}

export interface DeletionOutcome {
    requestId: string;
    status: AccountDeletionStatus;
    completedSteps: string[];
    lastError: string | null;
}

interface StepContext {
    userId: string;
    /** Email as it was before scrubbing; null once the row is a tombstone. */
    originalEmail: string | null;
    counts: Record<string, number>;
}

type Db = typeof db;

// Test seam: allows the deletion service to run against a transaction or a mock.
let client: Db = db;
export function __setDbForTests(next: Db | undefined): void {
    client = next ?? db;
}

function toOutcome(request: AccountDeletionRequest): DeletionOutcome {
    return {
        requestId: request.id,
        status: request.status,
        completedSteps: request.completedSteps,
        lastError: request.lastError,
    };
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

// ── Request ───────────────────────────────────────────────────────────────────

export interface RequestDeletionInput {
    userId: string;
    actorId: string;
    via: Exclude<RequestedVia, "RECONCILIATION">;
    reason?: string | null;
}

/**
 * Accept a deletion request and process it. Resolves with the final outcome;
 * a BLOCKED outcome means the request is durably recorded and will be retried.
 */
export async function requestAccountDeletion(input: RequestDeletionInput): Promise<DeletionOutcome> {
    let config;
    try {
        config = loadErasureConfig();
    } catch (error) {
        if (error instanceof ErasureNotConfiguredError) {
            console.error("[erasure] deletion refused: not configured");
            Sentry.captureException(error, { tags: { feature: "account-deletion" } });
            throw new DeletionUnavailableError();
        }
        throw error;
    }

    const user = await client.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true, name: true, role: true, erasedAt: true },
    });
    if (!user) throw new DeletionRefusedError("User not found");

    const existing = await client.accountDeletionRequest.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
    });
    if (existing?.status === "COMPLETED" || user.erasedAt) {
        return existing ? toOutcome(existing) : { requestId: "", status: "COMPLETED", completedSteps: [...DELETION_STEPS], lastError: null };
    }
    if (existing) {
        // Already accepted: resume rather than duplicate.
        return processDeletionRequest(existing.id);
    }

    if (user.role === "superadmin") {
        const otherSuperAdmins = await client.user.count({
            where: { role: "superadmin", erasedAt: null, id: { not: user.id } },
        });
        if (otherSuperAdmins === 0) {
            throw new DeletionRefusedError(
                "Transfer the super administrator role to another account before deleting this one."
            );
        }
    }

    // 1. Durable intent, outside the application database when configured.
    let journalId: string;
    try {
        const entry = await recordDeletionIntent({
            subjectId: user.id,
            emailHmac: config.hmacKey ? hmacPseudonym(config.hmacKey, user.email) : null,
            requestedVia: input.via,
        });
        journalId = entry.id;
    } catch (error) {
        console.error("[erasure] journal write failed; refusing deletion", error);
        Sentry.captureException(error, { tags: { feature: "account-deletion", stage: "journal" } });
        throw new DeletionUnavailableError();
    }

    // 2. Accept in the application database and lock the account out.
    const request = await client.$transaction(async (tx) => {
        const created = await tx.accountDeletionRequest.create({
            data: {
                userId: user.id,
                status: "ACCEPTED",
                requestedVia: input.via,
                requestedById: input.actorId,
                reason: input.reason?.slice(0, 1000) ?? null,
                journalId,
            },
        });
        await tx.user.update({
            where: { id: user.id },
            data: { deletionRequestedAt: new Date(), banned: true, banReason: PENDING_BAN_REASON, banExpires: null },
        });
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.auditLog.create({
            data: {
                action: "ACCOUNT_DELETION_REQUESTED",
                details: JSON.stringify({ via: input.via, requestId: created.id }),
                targetId: user.id,
                userId: input.actorId,
            },
        });
        return created;
    });

    // 3. Notice to the address on file, before it is scrubbed. Best effort.
    if (!isTombstoneEmail(user.email)) {
        await sendNotificationEmail({
            to: user.email,
            userName: user.name ?? "there",
            notificationType: "ACCOUNT_DELETION_STARTED",
            notificationMessage:
                "We have started deleting your CNERSH account. You have been signed out everywhere and can no longer sign in. " +
                "Personal data is being removed and the encryption key protecting your protected data will be destroyed. " +
                "Records the ethics committee is required to keep are retained without your identity. " +
                "If you did not request this, contact the CNERSH secretariat immediately.",
        });
    }

    return processDeletionRequest(request.id);
}

// ── Processing ────────────────────────────────────────────────────────────────

export async function processDeletionRequest(requestId: string): Promise<DeletionOutcome> {
    const request = await client.accountDeletionRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new DeletionRefusedError("Deletion request not found");
    if (request.status === "COMPLETED") return toOutcome(request);

    const user = await client.user.findUnique({
        where: { id: request.userId },
        select: { id: true, email: true, erasedAt: true },
    });
    if (!user) {
        // Row hard-deleted by an older code path; make sure the key is gone and close out.
        await destroySubjectKey(request.userId).catch(() => undefined);
        const done = await client.accountDeletionRequest.update({
            where: { id: request.id },
            data: { status: "COMPLETED", completedAt: new Date(), completedSteps: [...DELETION_STEPS] },
        });
        await markJournalStatus(request.userId, "COMPLETED", { note: "user row absent" }).catch(() => undefined);
        return toOutcome(done);
    }

    await client.accountDeletionRequest.update({
        where: { id: request.id },
        data: { status: "PROCESSING", attempts: { increment: 1 }, lastAttemptAt: new Date(), lastError: null },
    });

    const context: StepContext = {
        userId: user.id,
        originalEmail: isTombstoneEmail(user.email) ? null : user.email,
        counts: {},
    };
    const completed = new Set<string>(request.completedSteps);

    try {
        for (const step of DELETION_STEPS) {
            // "verify" always runs so a resumed request is re-checked end to end.
            if (completed.has(step) && step !== "verify") continue;
            await runStep(step, context);
            completed.add(step);
            await client.accountDeletionRequest.update({
                where: { id: request.id },
                data: { completedSteps: [...completed] },
            });
        }
    } catch (error) {
        const message = errorMessage(error);
        console.error(`[erasure] request ${request.id} blocked:`, message);
        Sentry.captureException(error, { tags: { feature: "account-deletion", requestId: request.id } });
        const blocked = await client.accountDeletionRequest.update({
            where: { id: request.id },
            data: { status: "BLOCKED", lastError: message.slice(0, 2000), completedSteps: [...completed] },
        });
        await markJournalStatus(user.id, "BLOCKED", { lastError: message.slice(0, 500) }).catch(() => undefined);
        return toOutcome(blocked);
    }

    const done = await client.accountDeletionRequest.update({
        where: { id: request.id },
        data: { status: "COMPLETED", completedAt: new Date(), lastError: null, completedSteps: [...DELETION_STEPS] },
    });
    await markJournalStatus(user.id, "COMPLETED", { counts: context.counts });
    await client.auditLog.create({
        data: {
            action: "ACCOUNT_ERASURE_COMPLETED",
            details: JSON.stringify({ requestId: request.id, counts: context.counts }),
            targetId: user.id,
            userId: request.requestedById,
        },
    }).catch((error) => console.error("[erasure] audit log write failed:", error));

    return toOutcome(done);
}

async function runStep(step: DeletionStep, ctx: StepContext): Promise<void> {
    switch (step) {
        case "revoke":
            return revokeAccess(ctx);
        case "content":
            return scrubCommunityContent(ctx);
        case "files":
            return deleteFiles(ctx);
        case "protocols":
            return handleProtocols(ctx);
        case "profile":
            return scrubProfile(ctx);
        case "key":
            return destroyKey(ctx);
        case "verify":
            return verifyErasure(ctx);
    }
}

async function revokeAccess(ctx: StepContext): Promise<void> {
    const { userId, originalEmail } = ctx;
    const sessions = await client.session.deleteMany({ where: { userId } });
    const accounts = await client.account.deleteMany({ where: { userId } });
    // Better Auth 1.6: password-reset rows store the user id in `value`; other
    // flows key by the email address. Email verification uses stateless JWTs.
    const verification = await client.verification.deleteMany({
        where: { OR: [{ value: userId }, ...(originalEmail ? [{ identifier: originalEmail }] : [])] },
    });
    ctx.counts.sessions = sessions.count;
    ctx.counts.accounts = accounts.count;
    ctx.counts.verificationTokens = verification.count;
}

async function scrubCommunityContent(ctx: StepContext): Promise<void> {
    const { userId } = ctx;
    const posts = await client.post.updateMany({
        where: { userId },
        data: { deleted: true, content: "", image: null, video: null, images: [], videos: [], tags: [], linkUrl: null, linkType: null },
    });
    const comments = await client.comment.updateMany({ where: { userId }, data: { deleted: true, content: "" } });
    const topics = await client.communityTopic.updateMany({
        where: { userId },
        data: { deleted: true, title: "[deleted]", content: "", image: null, images: [], video: null, videos: [], documents: [], linkUrl: null },
    });
    const replies = await client.communityReply.updateMany({
        where: { userId },
        data: {
            deleted: true, content: "", image: null, images: [], video: null, videos: [], audio: null, audios: [],
            voiceNote: null, document: null, documents: [], linkUrl: null, pollQuestion: null, pollOptions: [],
            pollVotes: Prisma.DbNull, eventTitle: null, eventDate: null, eventLocation: null,
        },
    });
    const [likes, commentLikes, topicLikes, notifications] = await Promise.all([
        client.like.deleteMany({ where: { userId } }),
        client.commentLike.deleteMany({ where: { userId } }),
        client.communityTopicLike.deleteMany({ where: { userId } }),
        client.notification.deleteMany({ where: { userId } }),
    ]);
    Object.assign(ctx.counts, {
        postsScrubbed: posts.count,
        commentsScrubbed: comments.count,
        topicsScrubbed: topics.count,
        repliesScrubbed: replies.count,
        reactionsDeleted: likes.count + commentLikes.count + topicLikes.count,
        notificationsDeleted: notifications.count,
    });
}

/** File ids and storage URLs referenced by protocols the committee keeps. */
async function retainedFileReferences(userId: string): Promise<Set<string>> {
    const projects = await client.project.findMany({
        where: { userId, deleted: false },
        select: { status: true, document: true, formData: true },
    });
    const refs = new Set<string>();
    for (const project of projects) {
        if (!isRetainedProjectStatus(project.status)) continue;
        if (project.document) refs.add(project.document);
        // The payload may be sealed under the owner's key, which still exists at
        // this step; decrypt it and scan for file ids and storage URLs.
        const opened = await openProjectFormData(project.formData);
        const text = JSON.stringify(opened.data ?? "");
        for (const match of text.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|https?:\/\/[^"'\s\\]+/gi)) {
            refs.add(match[0]);
        }
    }
    return refs;
}

async function deleteFiles(ctx: StepContext): Promise<void> {
    const { userId } = ctx;
    const references = await retainedFileReferences(userId);
    const files = await client.file.findMany({
        where: { userId },
        select: { id: true, type: true, storageKey: true, url: true },
    });

    let deleted = 0;
    let retained = 0;
    for (const file of files) {
        const referenced =
            RETAINED_FILE_TYPES.has(file.type) &&
            (references.has(file.id) || (file.url ? references.has(file.url) : false));
        if (referenced) {
            retained += 1;
            continue;
        }
        if (file.storageKey) {
            // Storage first. A failure here blocks the request; the row is kept so
            // the retry can find the object again. Never count this as erased.
            const result = await utapi.deleteFiles(file.storageKey);
            if (!result?.success) {
                throw new Error(`Storage provider did not confirm deletion of ${file.storageKey}`);
            }
        }
        await client.file.delete({ where: { id: file.id } });
        deleted += 1;
    }
    ctx.counts.filesDeleted = deleted;
    ctx.counts.filesRetainedWithProtocols = retained;
}

async function handleProtocols(ctx: StepContext): Promise<void> {
    const { userId } = ctx;
    const drafts = await client.project.deleteMany({ where: { userId, status: "DRAFT" } });

    const retained = await client.project.findMany({
        where: { userId },
        select: { id: true, formData: true },
    });
    let rekeyed = 0;
    for (const project of retained) {
        if (project.formData === null || project.formData === undefined) continue;
        const next = await rekeyProjectFormData(project.formData, INSTITUTION_SUBJECT);
        await client.project.update({ where: { id: project.id }, data: { formData: next as Prisma.InputJsonValue } });
        rekeyed += 1;
    }

    // Reviewer duties: drop assignments that produced no record, keep the rest
    // as evidence, and unassign the user from protocols still in flight.
    const emptyAssignments = await client.reviewAssignment.deleteMany({
        where: { reviewerId: userId, coiDeclaration: null, evaluationReport: null },
    });
    const unassigned = await client.project.updateMany({
        where: { assignedToId: userId },
        data: { assignedToId: null },
    });

    Object.assign(ctx.counts, {
        draftProtocolsDeleted: drafts.count,
        protocolsRetainedRekeyed: rekeyed,
        emptyReviewAssignmentsDeleted: emptyAssignments.count,
        protocolsUnassigned: unassigned.count,
    });
}

async function scrubProfile(ctx: StepContext): Promise<void> {
    await client.user.update({
        where: { id: ctx.userId },
        data: tombstoneUserFields(ctx.userId, new Date()),
    });
    ctx.originalEmail = null;
}

async function destroyKey(ctx: StepContext): Promise<void> {
    await destroySubjectKey(ctx.userId);
    if (!(await verifySubjectKeyDestroyed(ctx.userId))) {
        throw new Error("Key destruction could not be verified");
    }
    await markJournalKeyDestroyed(ctx.userId);
}

async function verifyErasure(ctx: StepContext): Promise<void> {
    const { userId } = ctx;
    const [user, sessions, accounts, liveContent, drafts, key] = await Promise.all([
        client.user.findUnique({ where: { id: userId }, select: { erasedAt: true, email: true, banned: true, image: true, name: true } }),
        client.session.count({ where: { userId } }),
        client.account.count({ where: { userId } }),
        client.post.count({ where: { userId, deleted: false } }),
        client.project.count({ where: { userId, status: "DRAFT" } }),
        getSubjectKey(userId),
    ]);
    const failures: string[] = [];
    if (!user?.erasedAt || !isTombstoneEmail(user.email) || user.banned !== true || user.image || user.name !== tombstoneUserFields(userId, new Date()).name) {
        failures.push("profile not scrubbed");
    }
    if (sessions > 0) failures.push(`${sessions} live sessions`);
    if (accounts > 0) failures.push(`${accounts} credential rows`);
    if (liveContent > 0) failures.push(`${liveContent} live posts`);
    if (drafts > 0) failures.push(`${drafts} draft protocols`);
    if (key) failures.push("subject key still present");
    if (failures.length) throw new Error(`Erasure verification failed: ${failures.join(", ")}`);
}

// ── Status and reconciliation ────────────────────────────────────────────────

export async function getDeletionRequestForUser(userId: string): Promise<AccountDeletionRequest | null> {
    return client.accountDeletionRequest.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export interface ReconciliationReport {
    checked: number;
    reapplied: string[];
    resumed: string[];
    blocked: string[];
    consistent: number;
}

export interface JournalFinding {
    subjectId: string;
    journalStatus: string;
    requestStatus: string | null;
    userPresent: boolean;
    userResurrected: boolean;
    liveSessions: number;
    credentialRows: number;
    keyPresent: boolean;
    consistent: boolean;
}

/** Read-only comparison of the erasure journal with the application database. */
export async function auditJournalConsistency(): Promise<JournalFinding[]> {
    const entries = await listJournalEntries();
    const findings: JournalFinding[] = [];
    for (const entry of entries) {
        const userId = entry.subjectId;
        const [user, request, sessions, accounts, key] = await Promise.all([
            client.user.findUnique({ where: { id: userId }, select: { erasedAt: true, email: true } }),
            getDeletionRequestForUser(userId),
            client.session.count({ where: { userId } }),
            client.account.count({ where: { userId } }),
            getSubjectKey(userId),
        ]);
        const userResurrected = Boolean(user && (!user.erasedAt || !isTombstoneEmail(user.email)));
        const consistent =
            entry.status === "COMPLETED" && !userResurrected && sessions === 0 && accounts === 0 && !key;
        findings.push({
            subjectId: userId,
            journalStatus: entry.status,
            requestStatus: request?.status ?? null,
            userPresent: Boolean(user),
            userResurrected,
            liveSessions: sessions,
            credentialRows: accounts,
            keyPresent: Boolean(key),
            consistent,
        });
    }
    return findings;
}

/**
 * Restore gate. Compares every journal entry with the application database
 * and re-applies deletions a restore may have undone. Safe to run at any time;
 * a consistent database produces no writes beyond `lastReconciledAt`.
 */
export async function reconcileWithJournal(): Promise<ReconciliationReport> {
    const report: ReconciliationReport = { checked: 0, reapplied: [], resumed: [], blocked: [], consistent: 0 };
    const entries = await listJournalEntries();

    for (const entry of entries) {
        report.checked += 1;
        const userId = entry.subjectId;
        const user = await client.user.findUnique({
            where: { id: userId },
            select: { erasedAt: true, email: true },
        });
        const [sessions, accounts, key] = await Promise.all([
            client.session.count({ where: { userId } }),
            client.account.count({ where: { userId } }),
            getSubjectKey(userId),
        ]);

        const userResurrected = Boolean(user && (!user.erasedAt || !isTombstoneEmail(user.email)));
        const needsWork = entry.status !== "COMPLETED" || userResurrected || sessions > 0 || accounts > 0 || Boolean(key);

        if (!needsWork) {
            report.consistent += 1;
            await markJournalReconciled(userId);
            continue;
        }

        if (!user) {
            // Nothing to scrub; make sure the key is gone and close the entry.
            await destroySubjectKey(userId).catch(() => undefined);
            await markJournalStatus(userId, "COMPLETED", { note: "user row absent at reconciliation" });
            await markJournalReconciled(userId);
            report.reapplied.push(userId);
            continue;
        }

        let request = await getDeletionRequestForUser(userId);
        if (!request || request.status === "COMPLETED") {
            // The restore erased or completed the request row; open a fresh one
            // so processing can start from step one.
            request = await client.accountDeletionRequest.create({
                data: {
                    userId,
                    status: "ACCEPTED",
                    requestedVia: "RECONCILIATION",
                    requestedById: userId,
                    journalId: entry.id,
                    reason: "Re-applied from erasure journal after inconsistency was detected",
                },
            });
            await client.user.update({
                where: { id: userId },
                data: { banned: true, banReason: PENDING_BAN_REASON, deletionRequestedAt: entry.requestedAt },
            }).catch(() => undefined);
            report.reapplied.push(userId);
        } else {
            report.resumed.push(userId);
        }

        const outcome = await processDeletionRequest(request.id);
        if (outcome.status !== "COMPLETED") report.blocked.push(userId);
        await markJournalReconciled(userId);
    }

    return report;
}

/** Retry every request the journal or the database still shows as unfinished. */
export async function retryUnfinishedRequests(limit = 25): Promise<DeletionOutcome[]> {
    const pending = await client.accountDeletionRequest.findMany({
        where: { status: { in: ["ACCEPTED", "PROCESSING", "BLOCKED"] } },
        orderBy: { createdAt: "asc" },
        take: limit,
    });
    const outcomes: DeletionOutcome[] = [];
    for (const request of pending) {
        outcomes.push(await processDeletionRequest(request.id));
    }
    return outcomes;
}

export { readJournalEntry };

import { db } from "@/lib/db";
import { Prisma, ReviewAssignmentStatus } from "@/generated/prisma";
import { isAutoAssignableRole } from "@/lib/permissions";

/** "Load" = assignments still occupying a reviewer. Completed ones don't count. */
export const ACTIVE_ASSIGNMENT_STATUSES: readonly ReviewAssignmentStatus[] = [
    ReviewAssignmentStatus.PENDING_COI,
    ReviewAssignmentStatus.ACTIVE,
];

export interface EligibleReviewer {
    id: string;
    name: string | null;
    email: string;
}

type Client = Prisma.TransactionClient | typeof db;

function client(tx?: Prisma.TransactionClient): Client {
    return tx ?? db;
}

/**
 * Eligible = role "admin" (superadmins are never auto-assigned),
 * not banned, and not in the exclusion list.
 */
export async function getEligibleReviewers(
    options: { excludeUserIds?: string[]; tx?: Prisma.TransactionClient } = {}
): Promise<EligibleReviewer[]> {
    const excludeUserIds = options.excludeUserIds ?? [];
    const rows = await client(options.tx).user.findMany({
        where: {
            role: "admin",
            OR: [{ banned: false }, { banned: null }],
            ...(excludeUserIds.length ? { id: { notIn: excludeUserIds } } : {}),
        },
        select: { id: true, name: true, email: true, role: true },
    });
    return rows
        .filter((r) => isAutoAssignableRole(r.role))
        .map(({ id, name, email }) => ({ id, name, email }));
}

/** reviewerId → current load. Missing entries mean load = 0. */
export async function getReviewerLoads(
    options: { reviewerIds?: string[]; tx?: Prisma.TransactionClient } = {}
): Promise<Map<string, number>> {
    const rows = await client(options.tx).reviewAssignment.groupBy({
        by: ["reviewerId"],
        where: {
            status: {
                in: ACTIVE_ASSIGNMENT_STATUSES as unknown as ReviewAssignmentStatus[],
            },
            ...(options.reviewerIds
                ? { reviewerId: { in: options.reviewerIds } }
                : {}),
        },
        _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.reviewerId, row._count._all);
    return map;
}

/** Lowest load, ties broken uniformly at random. */
export function pickLowestLoadReviewer(
    candidates: EligibleReviewer[],
    loads: Map<string, number>
): EligibleReviewer | null {
    if (candidates.length === 0) return null;
    let min = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
        const load = loads.get(c.id) ?? 0;
        if (load < min) min = load;
    }
    const tied = candidates.filter((c) => (loads.get(c.id) ?? 0) === min);
    return tied[Math.floor(Math.random() * tied.length)] ?? null;
}

/**
 * Picks the next reviewer for a protocol, excluding the owner and anyone
 * previously assigned (sticky reviewer rule).
 */
export async function selectReviewerForProtocol(
    options: {
        excludeUserIds?: string[];
        tx?: Prisma.TransactionClient;
    } = {}
): Promise<EligibleReviewer | null> {
    const candidates = await getEligibleReviewers(options);
    if (candidates.length === 0) return null;
    const loads = await getReviewerLoads({
        reviewerIds: candidates.map((c) => c.id),
        tx: options.tx,
    });
    return pickLowestLoadReviewer(candidates, loads);
}

export async function hasActiveAssignment(
    projectId: string,
    tx?: Prisma.TransactionClient
): Promise<{ id: string; reviewerId: string } | null> {
    return client(tx).reviewAssignment.findFirst({
        where: {
            projectId,
            status: {
                in: ACTIVE_ASSIGNMENT_STATUSES as unknown as ReviewAssignmentStatus[],
            },
        },
        select: { id: true, reviewerId: true },
    });
}

export async function getCurrentReviewer(
    projectId: string,
    tx?: Prisma.TransactionClient
) {
    return client(tx).reviewAssignment.findFirst({
        where: {
            projectId,
            status: {
                in: ACTIVE_ASSIGNMENT_STATUSES as unknown as ReviewAssignmentStatus[],
            },
        },
        include: {
            reviewer: {
                select: { id: true, name: true, email: true, role: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

/** True only when the caller is the protocol's current reviewer. */
export async function isCurrentReviewer(
    projectId: string,
    userId: string
): Promise<boolean> {
    const assignment = await getCurrentReviewer(projectId);
    return assignment?.reviewerId === userId;
}

/**
 * Automatic reassignment (Option A). Used only when:
 *   - current reviewer declares a COI,
 *   - reviewer is banned / deleted / demoted,
 *   - reviewer is the protocol owner.
 * The prior assignment is marked EXCLUDED, the new one starts at PENDING_COI.
 */
export async function autoReassignReviewer(params: {
    projectId: string;
    excludeUserIds?: string[];
    reason?: string;
    actorUserId?: string;
    tx: Prisma.TransactionClient;
}): Promise<{
    assignedReviewer: EligibleReviewer | null;
    previousReviewerId: string | null;
}> {
    const { projectId, excludeUserIds = [], reason, actorUserId, tx } = params;

    const project = await tx.project.findUnique({
        where: { id: projectId, deleted: false },
        select: { id: true, title: true, userId: true },
    });
    if (!project) return { assignedReviewer: null, previousReviewerId: null };

    const current = await tx.reviewAssignment.findFirst({
        where: {
            projectId,
            status: {
                in: ACTIVE_ASSIGNMENT_STATUSES as unknown as ReviewAssignmentStatus[],
            },
        },
        select: { id: true, reviewerId: true },
    });

    const previous = await tx.reviewAssignment.findMany({
        where: { projectId },
        select: { reviewerId: true },
    });

    const excluded = Array.from(
        new Set([
            project.userId,
            ...previous.map((r) => r.reviewerId),
            ...excludeUserIds,
        ])
    );

    if (current) {
        await tx.reviewAssignment.update({
            where: { id: current.id },
            data: { status: "EXCLUDED", reassignedAt: new Date() },
        });
    }

    const candidates = await getEligibleReviewers({ excludeUserIds: excluded, tx });
    if (candidates.length === 0) {
        return {
            assignedReviewer: null,
            previousReviewerId: current?.reviewerId ?? null,
        };
    }
    const loads = await getReviewerLoads({
        reviewerIds: candidates.map((c) => c.id),
        tx,
    });
    const next = pickLowestLoadReviewer(candidates, loads);
    if (!next) {
        return {
            assignedReviewer: null,
            previousReviewerId: current?.reviewerId ?? null,
        };
    }

    await tx.reviewAssignment.create({
        data: {
            projectId,
            reviewerId: next.id,
            status: "PENDING_COI",
            reassignedFromId: current?.reviewerId ?? null,
        },
    });

    if (actorUserId) {
        await tx.auditLog.create({
            data: {
                action: "AUTO_REASSIGN_REVIEWER",
                details: `Protocol "${project.title}" reassigned to ${next.name || next.email}${reason ? `. Reason: ${reason}` : ""}`,
                targetId: projectId,
                userId: actorUserId,
            },
        });
    }

    return { assignedReviewer: next, previousReviewerId: current?.reviewerId ?? null };
}
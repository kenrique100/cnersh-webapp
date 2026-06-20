"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { SessionType, SessionStatus, ProjectStatus } from "@/generated/prisma";

export async function createCommitteeSession(data: {
    sessionType: SessionType;
    sessionDate: string;
    venue?: string;
    notes?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden: Only admins can create committee sessions");
    }

    const sessionDate = new Date(data.sessionDate);

    const groups = await db.reviewAssignment.groupBy({
        by: ["projectId"],
        where: {
            status: "COMPLETED",
            evaluationReport: { status: "SUBMITTED" },
            project: { status: { in: ["PENDING_REVIEW", "REVIEW_COMPLETE"] }, deleted: false },
        },
        _count: { _all: true },
    });

    // Filter manually: only protocols with at least 2 completed reviews
    const eligibleProtocolIds = groups
        .filter((g) => (g._count?._all ?? 0) >= 2)
        .map((g) => g.projectId);

    const committeeSession = await db.committeeSession.create({
        data: {
            sessionType: data.sessionType,
            sessionDate,
            venue: data.venue || null,
            agenda: eligibleProtocolIds,
            status: "SCHEDULED",
            notes: data.notes || null,
            createdBy: session.user.id,
        },
    });

    if (eligibleProtocolIds.length > 0) {
        await db.project.updateMany({
            where: { id: { in: eligibleProtocolIds } },
            data: { status: ProjectStatus.SESSION_SCHEDULED },
        });

        const statusHistoryEntries = eligibleProtocolIds.map((projectId) => ({
            projectId,
            status: ProjectStatus.SESSION_SCHEDULED,
            changedBy: session.user.id,
            comment: `Scheduled for committee session on ${sessionDate.toLocaleDateString()}`,
        }));

        await db.projectStatusHistory.createMany({ data: statusHistoryEntries });
    }

    await db.auditLog.create({
        data: {
            action: "SESSION_CREATED",
            details: `${data.sessionType} committee session scheduled for ${sessionDate.toLocaleDateString()}. ${eligibleProtocolIds.length} protocols on agenda.`,
            targetId: committeeSession.id,
            userId: session.user.id,
        },
    });

    return committeeSession;
}

export async function getCommitteeSessions(status?: SessionStatus) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    return db.committeeSession.findMany({
        where: status ? { status } : undefined,
        orderBy: { sessionDate: "desc" },
    });
}

export async function updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    data?: { quorumMet?: boolean; minutes?: string; notes?: string }
) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    const committeeSession = await db.committeeSession.update({
        where: { id: sessionId },
        data: {
            status,
            ...(data?.quorumMet !== undefined ? { quorumMet: data.quorumMet } : {}),
            ...(data?.minutes ? { minutes: data.minutes } : {}),
            ...(data?.notes ? { notes: data.notes } : {}),
        },
    });

    if (status === "CANCELLED") {
        await db.auditLog.create({
            data: {
                action: "SESSION_CANCELLED",
                details: `Committee session cancelled. ${data?.notes || "No reason provided."}`,
                targetId: sessionId,
                userId: session.user.id,
            },
        });

        if (committeeSession.agenda && committeeSession.agenda.length > 0) {
            await db.project.updateMany({
                where: { id: { in: committeeSession.agenda } },
                data: { status: ProjectStatus.REVIEW_COMPLETE },
            });

            const historyEntries = committeeSession.agenda.map((projectId) => ({
                projectId,
                status: ProjectStatus.REVIEW_COMPLETE,
                changedBy: session.user.id,
                comment: "Session cancelled — rescheduling required",
            }));

            await db.projectStatusHistory.createMany({ data: historyEntries });
        }
    }

    return committeeSession;
}
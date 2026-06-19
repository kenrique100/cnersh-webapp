"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { SessionType, SessionStatus } from "@/generated/prisma";
import { notifyAdmins } from "@/lib/notify-admins";

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

    // Auto-populate agenda with protocols that have >= 2 submitted evaluation reports
    // Use a grouped query to let the database count reports per project (avoids pulling all nested records into memory)
    const groups = await db.reviewAssignment.groupBy({
        by: ["projectId"],
        where: {
            status: "COMPLETED",
            evaluationReport: { status: "SUBMITTED" },
            project: { status: { in: ["PENDING_REVIEW", "REVIEW_COMPLETE"] }, deleted: false },
        },
        _count: { _all: true },
        having: { _count: { _all: { gte: 2 } } },
    });

    const eligibleProtocolIds = groups.map((g) => g.projectId);

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

    // Update protocols on the agenda to SESSION_SCHEDULED
    if (eligibleProtocolIds.length > 0) {
        await db.project.updateMany({
            where: { id: { in: eligibleProtocolIds } },
            data: { status: "SESSION_SCHEDULED" },
        });

        // Record status history for each using a bulk insert to avoid N separate queries
        const statusHistoryEntries = eligibleProtocolIds.map((projectId) => ({
            projectId,
            status: "SESSION_SCHEDULED",
            changedBy: session.user.id,
            comment: `Scheduled for committee session on ${sessionDate.toLocaleDateString()}`,
        }));

        // createMany is atomic and much faster than creating one row per project
        // If createMany isn't supported for your setup, consider using a single raw query or transaction
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

        // Update all protocols on this session's agenda in bulk
        if (committeeSession.agenda && committeeSession.agenda.length > 0) {
            await db.project.updateMany({
                where: { id: { in: committeeSession.agenda } },
                data: { status: "REVIEW_COMPLETE" },
            });

            // Create status history entries in bulk
            const historyEntries = committeeSession.agenda.map((projectId) => ({
                projectId,
                status: "REVIEW_COMPLETE",
                changedBy: session.user.id,
                comment: "Session cancelled — rescheduling required",
            }));

            await db.projectStatusHistory.createMany({ data: historyEntries });
        }
    }

    return committeeSession;
}

"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";

const APPEAL_WINDOW_DAYS = 30;
const PRESIDENT_RESPONSE_DAYS = 45;

/**
 * File an appeal against a rejected protocol decision.
 * Only available within 30 calendar days of the rejection notification.
 * Only one appeal per unfavorable decision is permitted.
 */
export async function fileAppeal(data: {
    projectId: string;
    grounds: string;
    evidence?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const project = await db.project.findUnique({
        where: { id: data.projectId, deleted: false },
        include: {
            statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
            appeal: true,
        },
    });

    if (!project) throw new Error("Protocol not found");

    // Only the protocol owner can file an appeal
    if (project.userId !== session.user.id) throw new Error("Forbidden: Only the PI can file an appeal");

    // Protocol must be rejected
    if (project.status !== "REJECTED") {
        throw new Error("Appeals can only be filed against rejected protocols");
    }

    // Only one appeal per unfavorable decision
    if (project.appeal) {
        throw new Error("An appeal has already been filed for this protocol");
    }

    // Check the 30-day window from the rejection notification date
    const rejectionDate = project.statusHistory[0]?.createdAt;
    if (!rejectionDate) throw new Error("Rejection date not found");

    const now = new Date();
    const daysSinceRejection = (now.getTime() - rejectionDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceRejection > APPEAL_WINDOW_DAYS) {
        throw new Error(`The appeal window of ${APPEAL_WINDOW_DAYS} days has expired`);
    }

    if (!data.grounds || data.grounds.trim().length === 0) {
        throw new Error("Appeal grounds are required");
    }

    const deadlineAt = new Date(now.getTime() + PRESIDENT_RESPONSE_DAYS * 24 * 60 * 60 * 1000);

    const appeal = await db.appeal.create({
        data: {
            projectId: data.projectId,
            appellantId: session.user.id,
            grounds: data.grounds.trim(),
            evidence: data.evidence?.trim() || null,
            status: "PENDING",
            deadlineAt,
        },
    });

    // Update project status to UNDER_APPEAL
    await db.project.update({
        where: { id: data.projectId },
        data: {
            status: "UNDER_APPEAL",
            statusHistory: {
                create: {
                    status: "UNDER_APPEAL",
                    changedBy: session.user.id,
                    comment: "PI filed an appeal against the rejection decision",
                },
            },
        },
    });

    await db.auditLog.create({
        data: {
            action: "APPEAL_FILED",
            details: `PI filed an appeal for protocol "${project.title}"`,
            targetId: data.projectId,
            userId: session.user.id,
        },
    });

    // Notify admins about the appeal
    try {
        await notifyAdmins({
            type: "SYSTEM",
            message: `Appeal filed for protocol "${project.title}". President response required within ${PRESIDENT_RESPONSE_DAYS} days.`,
            link: `/admin/protocol-review`,
            excludeUserId: session.user.id,
        });
    } catch (error) {
        console.error("Error notifying admins about appeal:", error);
    }

    return {
        id: appeal.id,
        deadlineAt: appeal.deadlineAt.toISOString(),
        filedAt: appeal.filedAt.toISOString(),
    };
}

/**
 * Super-admin (committee president) resolves an appeal.
 */
export async function resolveAppeal(data: {
    projectId: string;
    decision: "UPHELD" | "REJECTED";
    decisionText: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "superadmin") {
        throw new Error("Forbidden: Only the committee president (super-admin) can resolve appeals");
    }

    const appeal = await db.appeal.findUnique({
        where: { projectId: data.projectId },
        include: {
            project: { select: { id: true, title: true, userId: true } },
        },
    });

    if (!appeal) throw new Error("Appeal not found");
    if (appeal.status !== "PENDING") throw new Error("This appeal has already been resolved");

    const now = new Date();
    const newProjectStatus = data.decision === "UPHELD" ? "APPROVED" : "APPEAL_RESOLVED";

    await db.$transaction([
        db.appeal.update({
            where: { projectId: data.projectId },
            data: {
                status: data.decision,
                decision: data.decisionText,
                decisionDate: now,
            },
        }),
        db.project.update({
            where: { id: data.projectId },
            data: {
                status: newProjectStatus,
                statusHistory: {
                    create: {
                        status: newProjectStatus,
                        changedBy: session.user.id,
                        comment: `Appeal ${data.decision.toLowerCase()}: ${data.decisionText}`,
                    },
                },
            },
        }),
        db.notification.create({
            data: {
                type: "PROJECT_STATUS",
                message: `Your appeal for protocol "${appeal.project.title}" has been ${data.decision.toLowerCase()}.`,
                link: `/protocols/${data.projectId}`,
                userId: appeal.project.userId,
            },
        }),
        db.auditLog.create({
            data: {
                action: `APPEAL_${data.decision}`,
                details: `Appeal ${data.decision.toLowerCase()} for protocol "${appeal.project.title}": ${data.decisionText}`,
                targetId: data.projectId,
                userId: session.user.id,
            },
        }),
    ]);

    return { success: true, decision: data.decision };
}

export async function getProjectAppeal(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const project = await db.project.findUnique({
        where: { id: projectId, deleted: false },
        select: { userId: true },
    });

    if (!project) throw new Error("Protocol not found");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isOwner = project.userId === session.user.id;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    if (!isOwner && !isAdmin) throw new Error("Forbidden");

    return db.appeal.findUnique({
        where: { projectId },
        include: {
            appellant: { select: { id: true, name: true, email: true } },
        },
    });
}

export async function getPendingAppeals() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "superadmin") {
        throw new Error("Forbidden: Only super-admins can view all appeals");
    }

    return db.appeal.findMany({
        where: { status: "PENDING" },
        include: {
            project: { select: { id: true, title: true, trackingCode: true } },
            appellant: { select: { id: true, name: true, email: true } },
        },
        orderBy: { filedAt: "asc" },
    });
}

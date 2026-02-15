"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function getAdminStats() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    const [
        totalUsers,
        bannedUsers,
        totalPosts,
        totalProjects,
        approvedProjects,
        rejectedProjects,
        pendingProjects,
        totalTopics,
        pendingReports,
    ] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { banned: true } }),
        db.post.count({ where: { deleted: false } }),
        db.project.count({ where: { deleted: false } }),
        db.project.count({ where: { status: "APPROVED", deleted: false } }),
        db.project.count({ where: { status: "REJECTED", deleted: false } }),
        db.project.count({
            where: {
                status: { in: ["SUBMITTED", "PENDING_REVIEW"] },
                deleted: false,
            },
        }),
        db.communityTopic.count({ where: { deleted: false } }),
        db.report.count({ where: { status: "PENDING" } }),
    ]);

    return {
        totalUsers,
        activeUsers: totalUsers - bannedUsers,
        bannedUsers,
        totalPosts,
        totalProjects,
        approvedProjects,
        rejectedProjects,
        pendingProjects,
        totalTopics,
        pendingReports,
    };
}

export async function getAuditLogs(page: number = 1, limit: number = 20) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    const [logs, total] = await Promise.all([
        db.auditLog.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.auditLog.count(),
    ]);

    return { logs, total, pages: Math.ceil(total / limit) };
}

export async function getReports(page: number = 1, limit: number = 20) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    const [reports, total] = await Promise.all([
        db.report.findMany({
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.report.count(),
    ]);

    return { reports, total, pages: Math.ceil(total / limit) };
}

export async function createReport(data: {
    contentType: "POST" | "COMMENT" | "TOPIC" | "REPLY";
    contentId: string;
    reason: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    return db.report.create({
        data: {
            reason: data.reason,
            contentType: data.contentType,
            contentId: data.contentId,
            userId: session.user.id,
        },
    });
}

async function requireAdmin() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    return session;
}

export async function resolveReport(
    reportId: string,
    action: "REVIEWED" | "DISMISSED",
) {
    const session = await requireAdmin();

    await db.report.update({
        where: { id: reportId },
        data: { status: action },
    });

    await db.auditLog.create({
        data: {
            action: "RESOLVE_REPORT",
            details: `Report resolved as ${action}`,
            targetId: reportId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function sendWarning(userId: string, message: string) {
    const session = await requireAdmin();

    await db.notification.create({
        data: {
            type: "SYSTEM",
            message,
            userId,
        },
    });

    await db.auditLog.create({
        data: {
            action: "SEND_WARNING",
            details: `Warning sent: ${message}`,
            targetId: userId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function banUserById(userId: string, reason: string) {
    const session = await requireAdmin();

    await db.user.update({
        where: { id: userId },
        data: { banned: true, banReason: reason },
    });

    await db.auditLog.create({
        data: {
            action: "BAN_USER",
            details: `User banned: ${reason}`,
            targetId: userId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function deleteReportedContent(
    contentType: string,
    contentId: string,
) {
    const session = await requireAdmin();

    switch (contentType) {
        case "POST":
            await db.post.update({
                where: { id: contentId },
                data: { deleted: true },
            });
            break;
        case "COMMENT":
            await db.comment.update({
                where: { id: contentId },
                data: { deleted: true },
            });
            break;
        case "TOPIC":
            await db.communityTopic.update({
                where: { id: contentId },
                data: { deleted: true },
            });
            break;
        case "REPLY":
            await db.communityReply.update({
                where: { id: contentId },
                data: { deleted: true },
            });
            break;
        default:
            throw new Error(`Unknown content type: ${contentType}`);
    }

    await db.auditLog.create({
        data: {
            action: "DELETE_CONTENT",
            details: `Deleted ${contentType} with id ${contentId}`,
            targetId: contentId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

/** Dashboard stats for normal users */
export async function getUserDashboardData() {
    const session = await authSession();
    if (!session) return null;

    try {
        const userId = session.user.id;

        const [
            totalPosts,
            totalProjects,
            approvedProjects,
            pendingProjects,
            unreadNotifications,
            recentPosts,
            recentProjects,
            recentCommunityTopics,
        ] = await Promise.all([
            db.post.count({ where: { userId, deleted: false } }),
            db.project.count({ where: { userId, deleted: false } }),
            db.project.count({ where: { userId, status: "APPROVED", deleted: false } }),
            db.project.count({
                where: {
                    userId,
                    status: { in: ["SUBMITTED", "PENDING_REVIEW"] },
                    deleted: false,
                },
            }),
            db.notification.count({ where: { userId, read: false } }),
            db.post.findMany({
                where: { userId, deleted: false },
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    _count: { select: { comments: true, likes: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            db.project.findMany({
                where: { userId, deleted: false },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            db.communityTopic.findMany({
                where: { deleted: false },
                select: {
                    id: true,
                    title: true,
                    category: true,
                    createdAt: true,
                    user: { select: { name: true } },
                    _count: { select: { replies: true, likes: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
        ]);

        return {
            stats: {
                totalPosts,
                totalProjects,
                approvedProjects,
                pendingProjects,
                unreadNotifications,
            },
            recentPosts: recentPosts.map((p) => ({
                ...p,
                createdAt: p.createdAt.toISOString(),
            })),
            recentProjects: recentProjects.map((p) => ({
                ...p,
                createdAt: p.createdAt.toISOString(),
            })),
            recentCommunityTopics: recentCommunityTopics.map((t) => ({
                ...t,
                createdAt: t.createdAt.toISOString(),
            })),
        };
    } catch (error) {
        console.error("Error fetching user dashboard data:", error);
        return null;
    }
}

/** Dashboard stats for admin and super admin */
export async function getAdminDashboardData() {
    const session = await authSession();
    if (!session) return null;

    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        if (user?.role !== "admin" && user?.role !== "superadmin") {
            return null;
        }

        const isSuperAdmin = user.role === "superadmin";

        const [
            totalUsers,
            bannedUsers,
            totalPosts,
            totalProjects,
            approvedProjects,
            pendingProjects,
            totalTopics,
            pendingReports,
            recentAuditLogs,
            recentProjects,
            recentCommunityTopics,
        ] = await Promise.all([
            db.user.count(),
            db.user.count({ where: { banned: true } }),
            db.post.count({ where: { deleted: false } }),
            db.project.count({ where: { deleted: false } }),
            db.project.count({ where: { status: "APPROVED", deleted: false } }),
            db.project.count({
                where: {
                    status: { in: ["SUBMITTED", "PENDING_REVIEW"] },
                    deleted: false,
                },
            }),
            db.communityTopic.count({ where: { deleted: false } }),
            db.report.count({ where: { status: "PENDING" } }),
            db.auditLog.findMany({
                include: {
                    user: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 8,
            }),
            db.project.findMany({
                where: {
                    status: { in: ["SUBMITTED", "PENDING_REVIEW"] },
                    deleted: false,
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    createdAt: true,
                    user: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            db.communityTopic.findMany({
                where: { deleted: false },
                select: {
                    id: true,
                    title: true,
                    category: true,
                    createdAt: true,
                    user: { select: { name: true } },
                    _count: { select: { replies: true, likes: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
        ]);

        return {
            isSuperAdmin,
            stats: {
                totalUsers,
                activeUsers: totalUsers - bannedUsers,
                bannedUsers,
                totalPosts,
                totalProjects,
                approvedProjects,
                pendingProjects,
                totalTopics,
                pendingReports,
            },
            recentAuditLogs: recentAuditLogs.map((log) => ({
                ...log,
                createdAt: log.createdAt.toISOString(),
            })),
            recentProjects: recentProjects.map((p) => ({
                ...p,
                createdAt: p.createdAt.toISOString(),
            })),
            recentCommunityTopics: recentCommunityTopics.map((t) => ({
                ...t,
                createdAt: t.createdAt.toISOString(),
            })),
        };
    } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        return null;
    }
}

"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions";
import { z } from "zod";

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
                    _count: {
                        select: {
                            comments: { where: { deleted: false } },
                            likes: true,
                        },
                    },
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
            // Community membership is restricted to administrators.
            recentCommunityTopics: [] as Array<{
                id: string;
                title: string;
                category: string;
                createdAt: string;
                user: { name: string | null };
                _count: { replies: number; likes: number };
            }>,
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

        if (!isAdminRole(user?.role)) {
            return null;
        }

        const isSuperAdmin = user.role === "superadmin";
        const visibleUserFilter = isSuperAdmin ? {} : { role: "user" as const };

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
            recentAuditLogs,
            recentProjects,
            recentCommunityTopics,
        ] = await Promise.all([
            db.user.count({ where: visibleUserFilter }),
            db.user.count({ where: { ...visibleUserFilter, banned: true } }),
            db.post.count({ where: { deleted: false } }),
            db.project.count({ where: { deleted: false } }),
            db.project.count({ where: { status: "APPROVED", deleted: false } }),
            db.project.count({ where: { status: "RESUBMIT", deleted: false } }),
            db.project.count({
                where: {
                    status: { in: ["SUBMITTED", "PENDING_REVIEW"] },
                    deleted: false,
                },
            }),
            db.communityTopic.count({ where: { deleted: false } }),
            db.report.count({ where: { status: "PENDING" } }),
            db.auditLog.findMany({
                where: isSuperAdmin ? {} : { userId: session.user.id },
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
                    _count: {
                        select: {
                            replies: { where: { deleted: false } },
                            likes: true,
                        },
                    },
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
                rejectedProjects,
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

/**
 * Returns the current user's profile fields.
 * Returns null when not authenticated.
 */
export async function updateProfile() {
    const session = await authSession();
    if (!session) return null;

    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
                email: true,
                name: true,
                image: true,
                role: true,
                profession: true,
                title: true,
            },
        });

        return user ?? null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

/**
 * Returns paginated posts and projects for the current user,
 * plus their total counts.
 * Throws "Unauthorized" when not authenticated.
 */
export async function getUserActivity(page = 1, limit = 10) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    try {
        const userId = session.user.id;
        const safePage = z.number().int().min(1).max(1_000_000).catch(1).parse(page);
        const safeLimit = z.number().int().min(1).max(50).catch(10).parse(limit);
        const skip = (safePage - 1) * safeLimit;

        const [posts, projects, totalPosts, totalProjects] = await Promise.all([
            db.post.findMany({
                where: { userId, deleted: false },
                select: {
                    id: true,
                    content: true,
                    image: true,
                    createdAt: true,
                    _count: {
                        select: {
                            comments: { where: { deleted: false } },
                            likes: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: safeLimit,
            }),
            db.project.findMany({
                where: { userId, deleted: false },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    category: true,
                    location: true,
                    feedback: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: safeLimit,
            }),
            db.post.count({ where: { userId, deleted: false } }),
            db.project.count({ where: { userId, deleted: false } }),
        ]);

        return {
            posts: posts.map((p) => ({
                ...p,
                createdAt: p.createdAt.toISOString(),
            })),
            projects: projects.map((p) => ({
                ...p,
                createdAt: p.createdAt.toISOString(),
            })),
            totalPosts,
            totalProjects,
        };
    } catch (error) {
        console.error("Error fetching user activity:", error);
        return {
            posts: [],
            projects: [],
            totalPosts: 0,
            totalProjects: 0,
        };
    }
}

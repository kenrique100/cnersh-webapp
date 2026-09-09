"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import {
    canAssignRole,
    canManageRole,
    isAdminRole,
    isRoleName,
    type RoleName,
} from "@/lib/permissions";
import { sanitizeText } from "@/lib/sanitize";
import { z } from "zod";

const idSchema = z.string().trim().min(1).max(128);
const paginationSchema = z.object({
    page: z.number().int().min(1).max(1_000_000).catch(1),
    limit: z.number().int().min(1).max(100).catch(20),
});
const reportSchema = z.object({
    contentType: z.enum(["POST", "COMMENT", "TOPIC", "REPLY"]),
    contentId: idSchema,
    reason: z.string().trim().min(1).max(2_000).transform(sanitizeText),
});
const managedUserSchema = z.object({
    name: z.string().trim().min(3).max(100).transform(sanitizeText),
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    role: z.enum(["user", "admin", "superadmin"]),
});
const createManagedUserSchema = managedUserSchema.extend({
    password: z.string().min(10).max(128),
});

function parsePagination(page: number, limit: number) {
    return paginationSchema.parse({ page, limit });
}

/** Stats and recent activity for the User Management page */
export async function getUserManagementData() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    const isSuperAdmin = user.role === "superadmin";

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Role-tiered filtering: regular admins only see regular users; super-admins see all
    const userFilter = isSuperAdmin ? {} : { role: "user" };

    const [
        totalUsers,
        activeUsers,
        bannedUsers,
        newRegistrations,
        recentAuditLogs,
        userList,
    ] = await Promise.all([
        db.user.count({ where: userFilter }),
        db.user.count({ where: { ...userFilter, banned: { not: true } } }),
        db.user.count({ where: { ...userFilter, banned: true } }),
        db.user.count({ where: { ...userFilter, createdAt: { gte: thirtyDaysAgo } } }),
        db.auditLog.findMany({
            where: isSuperAdmin ? {} : { userId: session.user.id },
            include: {
                user: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        }),
        db.user.findMany({
            where: userFilter,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true,
                banned: true,
                banReason: true,
                createdAt: true,
                emailVerified: true,
                pendingActivation: true,
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const weeklyNewUsers = await db.user.count({
        where: { ...userFilter, createdAt: { gte: sevenDaysAgo } },
    });

    return {
        stats: {
            totalUsers,
            activeUsers,
            bannedUsers,
            newRegistrations,
            weeklyNewUsers,
        },
        recentActivity: recentAuditLogs.map((log) => ({
            id: log.id,
            action: log.action,
            details: log.details,
            targetId: log.targetId,
            adminName: log.user.name || log.user.email,
            createdAt: log.createdAt.toISOString(),
        })),
        users: userList,
    };
}

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
        db.project.count({ where: { status: "RESUBMIT", deleted: false } }),
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

    const pagination = parsePagination(page, limit);
    const logFilter = user.role === "superadmin" ? {} : { userId: session.user.id };
    const [logs, total] = await Promise.all([
        db.auditLog.findMany({
            where: logFilter,
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
        }),
        db.auditLog.count({ where: logFilter }),
    ]);

    return { logs, total, pages: Math.ceil(total / pagination.limit) };
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

    const pagination = parsePagination(page, limit);
    const [reports, total] = await Promise.all([
        db.report.findMany({
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
        }),
        db.report.count(),
    ]);

    return { reports, total, pages: Math.ceil(total / pagination.limit) };
}

export async function createReport(data: {
    contentType: "POST" | "COMMENT" | "TOPIC" | "REPLY";
    contentId: string;
    reason: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const parsed = reportSchema.safeParse(data);
    if (!parsed.success) throw new Error("Invalid report");

    const report = await db.report.create({
        data: {
            reason: parsed.data.reason,
            contentType: parsed.data.contentType,
            contentId: parsed.data.contentId,
            userId: session.user.id,
        },
    });

    // Notify admins about the new report
    try {
        const contentLabel = parsed.data.contentType.toLowerCase().replace("_", " ");
        await notifyAdmins({
            type: "SYSTEM",
            message: `${session.user.name || "A user"} reported a ${contentLabel}: "${parsed.data.reason.substring(0, 80)}${parsed.data.reason.length > 80 ? "..." : ""}"`,
            link: "/admin/reports",
            excludeUserId: session.user.id,
        });
    } catch (error) {
        console.error("Error notifying admins about report:", error);
    }

    return report;
}

async function requireAdmin() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (!isAdminRole(user?.role)) {
        throw new Error("Forbidden");
    }

    return session;
}

export async function resolveReport(
    reportId: string,
    action: "REVIEWED" | "DISMISSED",
) {
    const session = await requireAdmin();
    const safeReportId = idSchema.parse(reportId);
    const safeAction = z.enum(["REVIEWED", "DISMISSED"]).parse(action);

    await db.report.update({
        where: { id: safeReportId },
        data: { status: safeAction },
    });

    await db.auditLog.create({
        data: {
            action: "RESOLVE_REPORT",
            details: `Report resolved as ${safeAction}`,
            targetId: safeReportId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function sendWarning(userId: string, message: string) {
    const session = await requireAdmin();
    const targetId = idSchema.parse(userId);
    const safeMessage = z.string().trim().min(1).max(2_000).transform(sanitizeText).parse(message);
    const [actingUser, targetUser] = await Promise.all([
        db.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
        db.user.findUnique({ where: { id: targetId }, select: { role: true } }),
    ]);
    if (!targetUser) throw new Error("User not found");
    if (!canManageRole(actingUser?.role, targetUser.role)) throw new Error("Forbidden");

    await db.notification.create({
        data: {
            type: "SYSTEM",
            message: safeMessage,
            userId: targetId,
        },
    });

    await db.auditLog.create({
        data: {
            action: "SEND_WARNING",
            details: `Warning sent: ${safeMessage}`,
            targetId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function banUserById(userId: string, reason: string) {
    const session = await requireAdmin();
    const targetId = idSchema.parse(userId);
    const safeReason = z.string().trim().min(1).max(1_000).transform(sanitizeText).parse(reason);

    const actingUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const targetUser = await db.user.findUnique({
        where: { id: targetId },
        select: { role: true },
    });

    if (!targetUser) throw new Error("User not found");

    if (!canManageRole(actingUser?.role, targetUser.role)) throw new Error("Forbidden");

    await db.user.update({
        where: { id: targetId },
        data: { banned: true, banReason: safeReason },
    });

    // Invalidate all active Better Auth sessions for the banned user
    await db.session.deleteMany({
        where: { userId: targetId },
    });

    await db.auditLog.create({
        data: {
            action: "BAN_USER",
            details: `User banned: ${safeReason}`,
            targetId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function unbanUserById(userId: string) {
    const session = await requireAdmin();
    const targetId = idSchema.parse(userId);

    const [actingUser, targetUser] = await Promise.all([
        db.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
        db.user.findUnique({
            where: { id: targetId },
            select: { name: true, email: true, role: true },
        }),
    ]);

    if (!targetUser) throw new Error("User not found");
    if (!canManageRole(actingUser?.role, targetUser.role)) throw new Error("Forbidden");

    await db.user.update({
        where: { id: targetId },
        data: { banned: false, banReason: null, banExpires: null },
    });

    await db.auditLog.create({
        data: {
            action: "UNBAN_USER",
            details: `User unbanned`,
            targetId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function activateUser(userId: string) {
    const session = await requireAdmin();
    const targetId = idSchema.parse(userId);

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "superadmin") {
        throw new Error("Forbidden: Only super-admins can activate pending users");
    }

    await db.user.update({
        where: { id: targetId },
        data: { pendingActivation: false, activationExpiresAt: null },
    });

    await db.auditLog.create({
        data: {
            action: "ACTIVATE_USER",
            details: `User account activated`,
            targetId,
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
    const parsedType = z.enum(["POST", "COMMENT", "TOPIC", "REPLY"]).safeParse(contentType);
    if (!parsedType.success) throw new Error(`Unknown content type: ${contentType}`);
    const safeType = parsedType.data;
    const targetId = idSchema.parse(contentId);

    const actingUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (!actingUser) throw new Error("Forbidden");

    let content: { deleted: boolean; user: { role: string | null } } | null;
    switch (safeType) {
        case "POST":
            content = await db.post.findUnique({
                where: { id: targetId },
                select: { deleted: true, user: { select: { role: true } } },
            });
            break;
        case "COMMENT":
            content = await db.comment.findUnique({
                where: { id: targetId },
                select: { deleted: true, user: { select: { role: true } } },
            });
            break;
        case "TOPIC":
            content = await db.communityTopic.findUnique({
                where: { id: targetId },
                select: { deleted: true, user: { select: { role: true } } },
            });
            break;
        case "REPLY":
            content = await db.communityReply.findUnique({
                where: { id: targetId },
                select: { deleted: true, user: { select: { role: true } } },
            });
            break;
    }

    if (!content || content.deleted) throw new Error("Content not found");
    if (!canManageRole(actingUser.role, content.user.role)) throw new Error("Forbidden");

    switch (safeType) {
        case "POST":
            await db.post.update({ where: { id: targetId }, data: { deleted: true } });
            break;
        case "COMMENT":
            await db.comment.update({ where: { id: targetId }, data: { deleted: true } });
            break;
        case "TOPIC":
            await db.communityTopic.update({ where: { id: targetId }, data: { deleted: true } });
            break;
        case "REPLY":
            await db.communityReply.update({ where: { id: targetId }, data: { deleted: true } });
            break;
    }

    await db.auditLog.create({
        data: {
            action: "DELETE_CONTENT",
            details: `Deleted ${safeType} with id ${targetId}`,
            targetId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

/**
 * Authoritatively changes a user's role. This action deliberately performs
 * both the hierarchy check and mutation; callers cannot pre-mutate through a
 * target-agnostic Better Auth endpoint and use this action only for logging.
 */
export async function applyRoleChange(
    userId: string,
    _oldRole: string,
    newRole: string,
) {
    const session = await requireAdmin();
    const targetId = idSchema.parse(userId);
    if (!isRoleName(newRole)) throw new Error("Invalid role");
    if (targetId === session.user.id) throw new Error("Forbidden");

    const [actingUser, targetUser] = await Promise.all([
        db.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
        db.user.findUnique({
            where: { id: targetId },
            select: { name: true, email: true, role: true },
        }),
    ]);

    if (!targetUser) throw new Error("User not found");
    if (!canManageRole(actingUser?.role, targetUser.role)) throw new Error("Forbidden");
    if (!canAssignRole(actingUser?.role, newRole)) throw new Error("Forbidden");
    if (targetUser.role === newRole) return { success: true };

    await db.user.update({ where: { id: targetId }, data: { role: newRole } });
    await db.session.deleteMany({ where: { userId: targetId } });

    await db.notification.create({
        data: {
            type: "SYSTEM",
            message: `Your account role has been updated from "${targetUser.role}" to "${newRole}". Please sign in again to access your new privileges.`,
            userId: targetId,
        },
    });

    await db.auditLog.create({
        data: {
            action: "CHANGE_ROLE",
            details: `User role changed from "${targetUser.role}" to "${newRole}"`,
            targetId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function createManagedUser(input: {
    name: string;
    email: string;
    password: string;
    role: RoleName;
}) {
    const session = await requireAdmin();
    const parsed = createManagedUserSchema.parse(input);
    const actor = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (!canAssignRole(actor?.role, parsed.role)) throw new Error("Forbidden");

    const [{ auth }, { headers }] = await Promise.all([
        import("@/lib/auth"),
        import("next/headers"),
    ]);
    const created = await auth.api.createUser({
        body: {
            name: parsed.name,
            email: parsed.email,
            password: parsed.password,
            ...(parsed.role === "user" ? {} : { role: parsed.role }),
        },
        headers: await headers(),
    });

    await db.auditLog.create({
        data: {
            action: "CREATE_USER",
            details: `Created user with role "${parsed.role}"`,
            targetId: created.user.id,
            userId: session.user.id,
        },
    });
    return { success: true, userId: created.user.id };
}

export async function updateManagedUser(
    userId: string,
    input: { name: string; email: string; role: RoleName },
) {
    const session = await requireAdmin();
    const targetId = idSchema.parse(userId);
    const parsed = managedUserSchema.parse(input);
    if (targetId === session.user.id) throw new Error("Forbidden");

    const [actor, target] = await Promise.all([
        db.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
        db.user.findUnique({ where: { id: targetId }, select: { role: true } }),
    ]);
    if (!target) throw new Error("User not found");
    if (!canManageRole(actor?.role, target.role)) throw new Error("Forbidden");
    if (!canAssignRole(actor?.role, parsed.role)) throw new Error("Forbidden");

    await db.user.update({
        where: { id: targetId },
        data: { name: parsed.name, email: parsed.email, role: parsed.role },
    });
    if (target.role !== parsed.role) {
        await db.session.deleteMany({ where: { userId: targetId } });
        await db.notification.create({
            data: {
                type: "SYSTEM",
                message: `Your account role has been updated from "${target.role}" to "${parsed.role}". Please sign in again to access your new privileges.`,
                userId: targetId,
            },
        });
    }
    await db.auditLog.create({
        data: {
            action: target.role === parsed.role ? "UPDATE_USER" : "CHANGE_ROLE",
            details: target.role === parsed.role
                ? "User profile updated"
                : `User role changed from "${target.role}" to "${parsed.role}"`,
            targetId,
            userId: session.user.id,
        },
    });
    return { success: true, roleChanged: target.role !== parsed.role };
}

export async function removeManagedUser(userId: string) {
    const session = await requireAdmin();
    const targetId = idSchema.parse(userId);
    if (targetId === session.user.id) throw new Error("Forbidden");
    const [actor, target] = await Promise.all([
        db.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
        db.user.findUnique({ where: { id: targetId }, select: { role: true } }),
    ]);
    if (!target) throw new Error("User not found");
    if (!canManageRole(actor?.role, target.role)) throw new Error("Forbidden");

    await db.user.delete({ where: { id: targetId } });
    await db.auditLog.create({
        data: {
            action: "DELETE_USER",
            details: "User account deleted",
            targetId,
            userId: session.user.id,
        },
    });
    return { success: true };
}

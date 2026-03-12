"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { ProjectStatus } from "@/generated/prisma";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { randomBytes } from "crypto";

/** Generate a unique, human-readable project tracking code.
 *  Format: CNERSH-{YEAR}-{8 uppercase alphanumeric chars}
 *  Example: CNERSH-2026-A3F7B29C
 */
async function generateTrackingCode(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 10; attempt++) {
        const random = randomBytes(4).toString("hex").toUpperCase();
        const code = `CNERSH-${year}-${random}`;
        const existing = await db.project.findUnique({ where: { trackingCode: code } });
        if (!existing) return code;
    }
    // Fallback: use timestamp-based unique code
    const ts = Date.now().toString(36).toUpperCase();
    return `CNERSH-${year}-${ts}`;
}

export async function submitProject(data: {
    title: string;
    description: string;
    objectives?: string;
    category: string;
    location?: string;
    timeline?: string;
    budget?: string;
    document?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    // Check if user is admin
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    // Admin-submitted projects are auto-approved, no review needed
    const projectStatus = isAdmin ? ProjectStatus.APPROVED : ProjectStatus.SUBMITTED;
    const statusComment = isAdmin ? "Protocol submitted and auto-approved by admin" : "Protocol submitted";

    const trackingCode = await generateTrackingCode();

    const project = await db.project.create({
        data: {
            trackingCode,
            title: data.title,
            description: data.description,
            objectives: data.objectives || null,
            category: data.category,
            location: data.location || null,
            timeline: data.timeline || null,
            budget: data.budget || null,
            document: data.document || null,
            status: projectStatus,
            userId: session.user.id,
            statusHistory: {
                create: {
                    status: projectStatus,
                    changedBy: session.user.id,
                    comment: statusComment,
                },
            },
        },
    });

    // Notify admins about new project submission (only for non-admin users)
    if (!isAdmin) {
        try {
            await notifyAdmins({
                type: "PROJECT_STATUS",
                message: `${session.user.name || "A user"} submitted a new protocol: "${project.title}"`,
                link: `/admin/project-review`,
                excludeUserId: session.user.id,
            });
        } catch (error) {
            console.error("Error notifying admins about project submission:", error);
        }
    }

    return project;
}

export async function getProjectById(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const project = await db.project.findUnique({
        where: { id: projectId, deleted: false },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            statusHistory: {
                orderBy: { createdAt: "desc" },
            },
        },
    });

    if (!project) return null;

    // Only allow project owner or admins to view
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isOwner = project.userId === session.user.id;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    if (!isOwner && !isAdmin) throw new Error("Forbidden");

    return project;
}

export async function getUserProjects() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    try {
        return await db.project.findMany({
            where: { userId: session.user.id, deleted: false },
            orderBy: { createdAt: "desc" },
            include: {
                statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
            },
        });
    } catch (error) {
        console.error("Error fetching user projects:", error);
        return [];
    }
}

export async function getAllProjects(status?: ProjectStatus) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    return db.project.findMany({
        where: {
            deleted: false,
            ...(status ? { status } : {}),
        },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            statusHistory: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function updateProjectStatus(
    projectId: string,
    status: ProjectStatus,
    feedback?: string
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

    const project = await db.project.update({
        where: { id: projectId },
        data: {
            status,
            feedback: feedback || null,
            statusHistory: {
                create: {
                    status,
                    changedBy: session.user.id,
                    comment: feedback || `Status changed to ${status}`,
                },
            },
        },
    });

    // Create notification for project owner
    const statusMessage = `Your protocol "${project.title}" has been ${status.toLowerCase().replace("_", " ")}`;
    await db.notification.create({
        data: {
            type: "PROJECT_STATUS",
            message: statusMessage,
            link: `/projects/${projectId}`,
            userId: project.userId,
        },
    });

    // Send email notification to project owner
    try {
        const projectOwner = await db.user.findUnique({
            where: { id: project.userId },
            select: { email: true, name: true },
        });
        if (projectOwner?.email) {
            sendNotificationEmail({
                to: projectOwner.email,
                userName: projectOwner.name || "User",
                notificationMessage: statusMessage,
                notificationType: "PROJECT_STATUS",
                actionUrl: `/projects/${projectId}`,
            }).catch((err) => console.error("Error sending project status email:", err));
        }
    } catch (error) {
        console.error("Error sending project status email notification:", error);
    }

    // Create audit log
    await db.auditLog.create({
        data: {
            action: `PROJECT_${status}`,
            details: `Protocol "${project.title}" status changed to ${status}${feedback ? `. Feedback: ${feedback}` : ""}`,
            targetId: projectId,
            userId: session.user.id,
        },
    });

    return project;
}

export async function deleteProject(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const project = await db.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
    });

    if (!project) throw new Error("Protocol not found");

    // Only owner can delete their own protocols
    if (project.userId !== session.user.id) {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
        if (user?.role !== "admin" && user?.role !== "superadmin") {
            throw new Error("Forbidden");
        }
    }

    await db.project.update({
        where: { id: projectId },
        data: { deleted: true },
    });

    return { success: true };
}

export async function updateProject(projectId: string, data: {
    title?: string;
    description?: string;
    objectives?: string;
    category?: string;
    location?: string;
    timeline?: string;
    budget?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const project = await db.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
    });

    if (!project) throw new Error("Protocol not found");

    // Only owner can edit their own protocols
    if (project.userId !== session.user.id) {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
        if (user?.role !== "admin" && user?.role !== "superadmin") {
            throw new Error("Forbidden");
        }
    }

    return db.project.update({
        where: { id: projectId },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.objectives !== undefined && { objectives: data.objectives }),
            ...(data.category !== undefined && { category: data.category }),
            ...(data.location !== undefined && { location: data.location }),
            ...(data.timeline !== undefined && { timeline: data.timeline }),
            ...(data.budget !== undefined && { budget: data.budget }),
        },
    });
}

export async function forwardProjectToFeed(projectId: string, data: {
    content: string;
    images?: string[];
    videos?: string[];
    tags?: string[];
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const project = await db.project.findUnique({
        where: { id: projectId, deleted: false },
        select: { userId: true, title: true, objectives: true },
    });

    if (!project) throw new Error("Protocol not found");

    // Only owner or admin can forward protocol to feed
    if (project.userId !== session.user.id) {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
        if (user?.role !== "admin" && user?.role !== "superadmin") {
            throw new Error("Forbidden");
        }
    }

    const post = await db.post.create({
        data: {
            content: data.content,
            images: data.images || [],
            videos: data.videos || [],
            tags: data.tags || [],
            userId: session.user.id,
        },
    });

    return post;
}

export async function getAdminUsers() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "superadmin") {
        throw new Error("Forbidden: Only super admins can list admin users");
    }

    return db.user.findMany({
        where: {
            role: { in: ["admin", "superadmin"] },
            banned: { not: true },
        },
        select: { id: true, name: true, email: true, image: true, role: true },
        orderBy: { name: "asc" },
    });
}

export async function assignProjectReviewer(projectId: string, adminId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "superadmin") {
        throw new Error("Forbidden: Only super admins can assign reviewers");
    }

    const admin = await db.user.findUnique({
        where: { id: adminId },
        select: { id: true, name: true, email: true, role: true },
    });

    if (!admin || (admin.role !== "admin" && admin.role !== "superadmin")) {
        throw new Error("Selected user is not an admin");
    }

    const project = await db.project.update({
        where: { id: projectId },
        data: {
            assignedToId: adminId,
            status: "PENDING_REVIEW",
            statusHistory: {
                create: {
                    status: "PENDING_REVIEW",
                    changedBy: session.user.id,
                    // Keep reviewer identity anonymous in public-facing history
                    comment: "Protocol assigned for review",
                },
            },
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    // Notify the assigned admin
    await db.notification.create({
        data: {
            type: "REVIEW_ASSIGNED",
            message: `You have been assigned to review the protocol: "${project.title}"`,
            link: `/projects/${projectId}`,
            userId: adminId,
        },
    });

    // Send email notification to the assigned admin
    try {
        if (admin.email) {
            sendNotificationEmail({
                to: admin.email,
                userName: admin.name || "Admin",
                notificationMessage: `You have been assigned to review the protocol: "${project.title}" submitted by ${project.user.name || "a user"}.`,
                notificationType: "REVIEW_ASSIGNED",
                actionUrl: `/projects/${projectId}`,
            }).catch((err) => console.error("Error sending review assignment email:", err));
        }
    } catch (error) {
        console.error("Error sending review assignment email:", error);
    }

    // Create audit log
    await db.auditLog.create({
        data: {
            action: "ASSIGN_REVIEWER",
            details: `Assigned ${admin.name || admin.email} to review protocol "${project.title}"`,
            targetId: projectId,
            userId: session.user.id,
        },
    });

    return project;
}

/**
 * Public project tracker — looks up a project by tracking code.
 * Returns safe, limited data (no submitter PII, no reviewer identity).
 * Accessible without authentication.
 */
export async function trackProjectByCode(trackingCode: string) {
    const code = trackingCode.trim().toUpperCase();

    const project = await db.project.findUnique({
        where: { trackingCode: code, deleted: false },
        select: {
            id: true,
            trackingCode: true,
            title: true,
            category: true,
            location: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            statusHistory: {
                orderBy: { createdAt: "desc" },
                select: {
                    status: true,
                    comment: true,
                    createdAt: true,
                },
            },
        },
    });

    return project ?? null;
}

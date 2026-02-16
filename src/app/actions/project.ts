"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { ProjectStatus } from "@/generated/prisma";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";

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
    const statusComment = isAdmin ? "Project submitted and auto-approved by admin" : "Project submitted";

    const project = await db.project.create({
        data: {
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
                message: `${session.user.name || "A user"} submitted a new project: "${project.title}"`,
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
    const statusMessage = `Your project "${project.title}" has been ${status.toLowerCase().replace("_", " ")}`;
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
            details: `Project "${project.title}" status changed to ${status}${feedback ? `. Feedback: ${feedback}` : ""}`,
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

    if (!project) throw new Error("Project not found");

    // Only owner can delete their own projects
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

    if (!project) throw new Error("Project not found");

    // Only owner can edit their own projects
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

    if (!project) throw new Error("Project not found");

    // Only owner or admin can forward project to feed
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

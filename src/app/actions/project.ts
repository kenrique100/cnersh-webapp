"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { ProjectStatus } from "@/generated/prisma";

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
            status: ProjectStatus.SUBMITTED,
            userId: session.user.id,
            statusHistory: {
                create: {
                    status: ProjectStatus.SUBMITTED,
                    changedBy: session.user.id,
                    comment: "Project submitted",
                },
            },
        },
    });

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
    await db.notification.create({
        data: {
            type: "PROJECT_STATUS",
            message: `Your project "${project.title}" has been ${status.toLowerCase().replace("_", " ")}`,
            link: `/projects`,
            userId: project.userId,
        },
    });

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

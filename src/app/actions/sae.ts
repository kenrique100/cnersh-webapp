"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { SAEEventType } from "@/generated/prisma";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";

const SAE_REPORT_WINDOW_HOURS = 24;

export async function reportSAE(data: {
    projectId: string;
    eventType: SAEEventType;
    eventDate: string;
    description: string;
    immediateActions?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    // Verify the project exists and belongs to the reporter or reporter is an admin
    const project = await db.project.findUnique({
        where: { id: data.projectId, deleted: false },
        select: { id: true, title: true, userId: true, status: true },
    });

    if (!project) throw new Error("Protocol not found");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, name: true, email: true },
    });

    const isOwner = project.userId === session.user.id;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    if (!isOwner && !isAdmin) throw new Error("Forbidden: Only the PI or admin can report SAEs");

    // Check if the project is in an approved state
    const allowedStatuses = ["APPROVED", "APPROVED_WITH_CONDITIONS", "UNDER_APPEAL", "APPEAL_RESOLVED"];
    if (!allowedStatuses.includes(project.status)) {
        throw new Error("SAE reports can only be filed for approved protocols");
    }

    const eventDate = new Date(data.eventDate);
    const now = new Date();
    const hoursSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    const isLate = hoursSinceEvent > SAE_REPORT_WINDOW_HOURS;

    const report = await db.sAEReport.create({
        data: {
            projectId: data.projectId,
            reporterId: session.user.id,
            eventType: data.eventType,
            eventDate,
            description: data.description,
            immediateActions: data.immediateActions || null,
            isLate,
        },
    });

    // Log compliance violation if report is late
    if (isLate) {
        await db.auditLog.create({
            data: {
                action: "SAE_LATE_REPORT",
                details: `Late SAE report for protocol "${project.title}". Event date: ${eventDate.toISOString()}. Submitted: ${now.toISOString()}.`,
                targetId: data.projectId,
                userId: session.user.id,
            },
        });
    }

    await db.auditLog.create({
        data: {
            action: "SAE_REPORTED",
            details: `SAE reported for protocol "${project.title}". Event type: ${data.eventType}${isLate ? " [LATE SUBMISSION]" : ""}`,
            targetId: data.projectId,
            userId: session.user.id,
        },
    });

    // Notify all admins about the SAE
    try {
        await notifyAdmins({
            type: "SYSTEM",
            message: `🚨 SAE reported for protocol "${project.title}" (${data.eventType.replace(/_/g, " ")})${isLate ? " — LATE SUBMISSION" : ""}`,
            link: `/admin/protocol-review`,
            excludeUserId: session.user.id,
        });
    } catch (error) {
        console.error("Error notifying admins about SAE:", error);
    }

    // For life-threatening or fatal events, send additional urgent notification
    if (data.eventType === "LIFE_THREATENING" || data.eventType === "FATAL") {
        try {
            await notifyAdmins({
                type: "SYSTEM",
                message: `🔴 URGENT: ${data.eventType} event reported for protocol "${project.title}". Immediate action required.`,
                link: `/admin/protocol-review`,
                excludeUserId: session.user.id,
            });
        } catch (error) {
            console.error("Error sending urgent SAE notification:", error);
        }
    }

    return {
        id: report.id,
        isLate,
        reportedAt: report.reportedAt.toISOString(),
    };
}

export async function getProjectSAEReports(projectId: string) {
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

    return db.sAEReport.findMany({
        where: { projectId },
        include: {
            reporter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { reportedAt: "desc" },
    });
}

export async function getAllSAEReports() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    return db.sAEReport.findMany({
        include: {
            project: { select: { id: true, title: true, trackingCode: true } },
            reporter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { reportedAt: "desc" },
    });
}

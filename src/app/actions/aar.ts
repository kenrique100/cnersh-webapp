"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AARStatus } from "@/generated/prisma";
import { notifyAdmins } from "@/lib/notify-admins";

const DROS_REVIEW_WORKING_DAYS = 21;
const CLARIFICATION_RESPONSE_WORKING_DAYS = 30;

function addWorkingDays(startDate: Date, days: number): Date {
    let count = 0;
    const date = new Date(startDate);
    while (count < days) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
    }
    return date;
}

/**
 * Create or get the AAR application for an approved protocol.
 * Only available after Protocol.status === APPROVED.
 */
export async function startAARApplication(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const project = await db.project.findUnique({
        where: { id: projectId, deleted: false },
        include: { aarApplication: true },
    });

    if (!project) throw new Error("Protocol not found");

    // Status check: locked behind APPROVED
    if (project.status !== "APPROVED" && project.status !== "APPROVED_WITH_CONDITIONS") {
        throw new Error("AAR applications can only be started for approved protocols");
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isOwner = project.userId === session.user.id;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    if (!isOwner && !isAdmin) throw new Error("Forbidden");

    if (project.aarApplication) {
        return project.aarApplication;
    }

    const application = await db.aARApplication.create({
        data: {
            projectId,
            applicantId: session.user.id,
            status: "DRAFT",
        },
    });

    return application;
}

export async function submitAARApplication(projectId: string, notes?: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const application = await db.aARApplication.findUnique({
        where: { projectId },
        include: {
            project: { select: { id: true, title: true, userId: true, status: true } },
        },
    });

    if (!application) throw new Error("AAR application not found");

    if (application.project.status !== "APPROVED" && application.project.status !== "APPROVED_WITH_CONDITIONS") {
        throw new Error("AAR applications can only be submitted for approved protocols");
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isOwner = application.project.userId === session.user.id;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    if (!isOwner && !isAdmin) throw new Error("Forbidden");

    if (application.status !== "DRAFT") {
        throw new Error("This AAR application has already been submitted");
    }

    const now = new Date();

    await db.aARApplication.update({
        where: { projectId },
        data: {
            status: "SUBMITTED",
            submittedAt: now,
            notes: notes || null,
        },
    });

    await db.auditLog.create({
        data: {
            action: "AAR_SUBMITTED",
            details: `AAR application submitted for protocol "${application.project.title}"`,
            targetId: projectId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

/**
 * DROS Officer: confirm receipt and start the 21-working-day review clock.
 */
export async function confirmAARReceipt(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    const application = await db.aARApplication.findUnique({
        where: { projectId },
        include: {
            project: { select: { id: true, title: true, userId: true } },
        },
    });

    if (!application) throw new Error("AAR application not found");
    if (application.status !== "SUBMITTED") {
        throw new Error("This application has not been submitted yet");
    }

    const now = new Date();
    const drosDueDate = addWorkingDays(now, DROS_REVIEW_WORKING_DAYS);

    await db.aARApplication.update({
        where: { projectId },
        data: {
            status: "RECEIVED_BY_DROS",
            drosReceivedAt: now,
            drosDueDate,
        },
    });

    // Notify the PI
    await db.notification.create({
        data: {
            type: "PROJECT_STATUS",
            message: `Your AAR application for "${application.project.title}" has been received by DROS. Review deadline: ${drosDueDate.toLocaleDateString()}`,
            link: `/protocols/${projectId}`,
            userId: application.project.userId,
        },
    });

    await db.auditLog.create({
        data: {
            action: "AAR_RECEIVED_BY_DROS",
            details: `DROS confirmed receipt of AAR application for "${application.project.title}". Due date: ${drosDueDate.toISOString()}`,
            targetId: projectId,
            userId: session.user.id,
        },
    });

    return { success: true, drosDueDate: drosDueDate.toISOString() };
}

export async function updateAARStatus(
    projectId: string,
    status: AARStatus,
    data?: { aarRefNumber?: string; notes?: string }
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

    const application = await db.aARApplication.findUnique({
        where: { projectId },
        include: {
            project: { select: { id: true, title: true, userId: true } },
        },
    });

    if (!application) throw new Error("AAR application not found");

    // INADMISSIBLE is terminal — cannot be changed
    if (application.status === "INADMISSIBLE") {
        throw new Error("This AAR application is inadmissible and cannot be updated");
    }

    await db.aARApplication.update({
        where: { projectId },
        data: {
            status,
            ...(data?.aarRefNumber ? { aarRefNumber: data.aarRefNumber } : {}),
            ...(data?.notes ? { notes: data.notes } : {}),
        },
    });

    // Notify the PI of status change
    const statusMessages: Partial<Record<AARStatus, string>> = {
        AUTHORIZED: `Your AAR application for "${application.project.title}" has been authorized by the Minister.`,
        CLARIFICATION_REQUESTED: `DROS has requested clarification for your AAR application for "${application.project.title}". You have ${CLARIFICATION_RESPONSE_WORKING_DAYS} working days to respond.`,
        INADMISSIBLE: `Your AAR application for "${application.project.title}" has been declared inadmissible. Please start a new application.`,
    };

    const message = statusMessages[status];
    if (message) {
        await db.notification.create({
            data: {
                type: "PROJECT_STATUS",
                message,
                link: `/protocols/${projectId}`,
                userId: application.project.userId,
            },
        });
    }

    await db.auditLog.create({
        data: {
            action: `AAR_STATUS_${status}`,
            details: `AAR application status updated to ${status} for "${application.project.title}"`,
            targetId: projectId,
            userId: session.user.id,
        },
    });

    return { success: true };
}

export async function getAARApplication(projectId: string) {
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

    return db.aARApplication.findUnique({
        where: { projectId },
        include: {
            applicant: { select: { id: true, name: true, email: true } },
        },
    });
}

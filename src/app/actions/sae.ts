"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Prisma, SAEEventType } from "@/generated/prisma";
import { notifyAdmins } from "@/lib/notify-admins";
import { z } from "zod";

const SAE_REPORT_WINDOW_HOURS = 24;
const idSchema = z.string().trim().min(1, "Protocol identifier is required").max(128);
const reportSchema = z.object({
    projectId: idSchema,
    eventType: z.enum(SAEEventType),
    eventDate: z.string().trim().min(1, "Event date is required"),
    description: z.string().trim().min(1, "Event description is required").max(20_000),
    immediateActions: z.string().trim().max(20_000).optional(),
}).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) throw new Error(result.error.issues[0]?.message || "Invalid SAE report");
    return result.data;
}

export async function reportSAE(data: {
    projectId: string;
    eventType: SAEEventType;
    eventDate: string;
    description: string;
    immediateActions?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const input = parse(reportSchema, data);
    const eventDate = new Date(input.eventDate);
    if (!Number.isFinite(eventDate.getTime())) throw new Error("Event date must be a valid date");
    const now = new Date();
    if (eventDate.getTime() > now.getTime()) throw new Error("Event date cannot be in the future");

    const project = await db.project.findUnique({
        where: { id: input.projectId, deleted: false },
        select: { id: true, title: true, userId: true, status: true },
    });
    if (!project) throw new Error("Protocol not found");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    const isOwner = project.userId === session.user.id;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    if (!isOwner && !isAdmin) throw new Error("Forbidden: Only the PI or admin can report SAEs");
    if (project.status !== "APPROVED" && project.status !== "APPROVED_WITH_CONDITIONS") {
        throw new Error("SAE reports can only be filed for approved protocols");
    }

    const hoursSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    const isLate = hoursSinceEvent > SAE_REPORT_WINDOW_HOURS;
    const report = await db.$transaction(async (tx) => {
        const currentProject = await tx.project.findUnique({
            where: { id: input.projectId, deleted: false },
            select: { status: true },
        });
        if (
            !currentProject
            || (currentProject.status !== "APPROVED"
                && currentProject.status !== "APPROVED_WITH_CONDITIONS")
        ) {
            throw new Error("Protocol is no longer eligible for SAE reporting");
        }

        const created = await tx.sAEReport.create({
            data: {
                projectId: input.projectId,
                reporterId: session.user.id,
                eventType: input.eventType,
                eventDate,
                description: input.description,
                immediateActions: input.immediateActions || null,
                isLate,
            },
        });
        if (isLate) {
            await tx.auditLog.create({
                data: {
                    action: "SAE_LATE_REPORT",
                    details: `Late SAE report for protocol "${project.title}". Event date: ${eventDate.toISOString()}. Submitted: ${now.toISOString()}.`,
                    targetId: input.projectId,
                    userId: session.user.id,
                },
            });
        }
        await tx.auditLog.create({
            data: {
                action: "SAE_REPORTED",
                details: `SAE reported for protocol "${project.title}". Event type: ${input.eventType}${isLate ? " [LATE SUBMISSION]" : ""}`,
                targetId: input.projectId,
                userId: session.user.id,
            },
        });
        return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await notifyAdmins({
        type: "SYSTEM",
        message: `SAE reported for protocol "${project.title}" (${input.eventType.replaceAll("_", " ")})${isLate ? " - LATE SUBMISSION" : ""}`,
        link: "/admin/protocol-review",
        excludeUserId: session.user.id,
    }).catch((error) => console.error("Error notifying admins about SAE:", error));

    if (input.eventType === "LIFE_THREATENING" || input.eventType === "FATAL") {
        await notifyAdmins({
            type: "SYSTEM",
            message: `URGENT: ${input.eventType} event reported for protocol "${project.title}". Immediate action required.`,
            link: "/admin/protocol-review",
            excludeUserId: session.user.id,
        }).catch((error) => console.error("Error sending urgent SAE notification:", error));
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
    const validProjectId = parse(idSchema, projectId);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
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
        where: { projectId: validProjectId },
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
        where: { project: { deleted: false } },
        include: {
            project: { select: { id: true, title: true, trackingCode: true } },
            reporter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { reportedAt: "desc" },
    });
}

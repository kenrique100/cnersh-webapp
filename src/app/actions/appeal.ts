"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { z } from "zod";

const APPEAL_WINDOW_DAYS = 30;
const PRESIDENT_RESPONSE_DAYS = 45;
const DAY_MS = 24 * 60 * 60 * 1000;
const idSchema = z.string().trim().min(1, "Protocol identifier is required").max(128);
const fileAppealSchema = z.object({
    projectId: idSchema,
    grounds: z.string().trim().min(1, "Appeal grounds are required").max(20_000),
    evidence: z.string().trim().max(20_000).optional(),
}).strict();
const resolveAppealSchema = z.object({
    projectId: idSchema,
    decision: z.enum(["UPHELD", "REJECTED"]),
    decisionText: z.string().trim().min(1, "A decision explanation is required").max(20_000),
}).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) throw new Error(result.error.issues[0]?.message || "Invalid appeal data");
    return result.data;
}

export async function fileAppeal(data: {
    projectId: string;
    grounds: string;
    evidence?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const input = parse(fileAppealSchema, data);

    const result = await db.$transaction(async (tx) => {
        const project = await tx.project.findUnique({
            where: { id: input.projectId, deleted: false },
            include: {
                statusHistory: {
                    where: { status: "RESUBMIT" },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                appeal: true,
            },
        });
        if (!project) throw new Error("Protocol not found");
        if (project.userId !== session.user.id) {
            throw new Error("Forbidden: Only the PI can file an appeal");
        }

        if (project.appeal) {
            if (
                project.appeal.appellantId === session.user.id
                && project.appeal.grounds === input.grounds
                && (project.appeal.evidence || null) === (input.evidence || null)
            ) {
                return { appeal: project.appeal, title: project.title, created: false };
            }
            throw new Error("An appeal has already been filed for this protocol");
        }
        if (project.status !== "RESUBMIT") {
            throw new Error("Appeals can only be filed against rejected protocols");
        }

        const rejectionDate = project.statusHistory[0]?.createdAt;
        if (!rejectionDate) throw new Error("Rejection date not found");
        const now = new Date();
        if (rejectionDate.getTime() > now.getTime()) throw new Error("Rejection date cannot be in the future");
        if (now.getTime() - rejectionDate.getTime() > APPEAL_WINDOW_DAYS * DAY_MS) {
            throw new Error(`The appeal window of ${APPEAL_WINDOW_DAYS} days has expired`);
        }

        const appeal = await tx.appeal.create({
            data: {
                projectId: input.projectId,
                appellantId: session.user.id,
                grounds: input.grounds,
                evidence: input.evidence || null,
                status: "PENDING",
                deadlineAt: new Date(now.getTime() + PRESIDENT_RESPONSE_DAYS * DAY_MS),
            },
        });
        const transitioned = await tx.project.updateMany({
            where: { id: input.projectId, deleted: false, status: "RESUBMIT" },
            data: { status: "UNDER_APPEAL" },
        });
        if (transitioned.count !== 1) throw new Error("Protocol status changed concurrently; please retry");

        await tx.projectStatusHistory.create({
            data: {
                projectId: input.projectId,
                status: "UNDER_APPEAL",
                changedBy: session.user.id,
                comment: "PI filed an appeal against the rejection decision",
            },
        });
        await tx.auditLog.create({
            data: {
                action: "APPEAL_FILED",
                details: `PI filed an appeal for protocol "${project.title}"`,
                targetId: input.projectId,
                userId: session.user.id,
            },
        });
        return { appeal, title: project.title, created: true };
    });

    if (result.created) {
        await notifyAdmins({
            type: "SYSTEM",
            message: `Appeal filed for protocol "${result.title}". President response required within ${PRESIDENT_RESPONSE_DAYS} days.`,
            link: "/admin/protocol-review",
            excludeUserId: session.user.id,
        }).catch((error) => console.error("Error notifying admins about appeal:", error));
    }

    return {
        id: result.appeal.id,
        deadlineAt: result.appeal.deadlineAt.toISOString(),
        filedAt: result.appeal.filedAt.toISOString(),
    };
}

export async function resolveAppeal(data: {
    projectId: string;
    decision: "UPHELD" | "REJECTED";
    decisionText: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const input = parse(resolveAppealSchema, data);

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "superadmin") {
        throw new Error("Forbidden: Only the committee president (super-admin) can resolve appeals");
    }

    return db.$transaction(async (tx) => {
        const appeal = await tx.appeal.findUnique({
            where: { projectId: input.projectId },
            include: {
                project: { select: { id: true, title: true, userId: true, status: true, deleted: true } },
            },
        });
        if (!appeal || appeal.project.deleted) throw new Error("Appeal not found");
        if (appeal.status !== "PENDING") {
            if (appeal.status === input.decision) return { success: true, decision: input.decision };
            throw new Error("This appeal has already been resolved");
        }
        if (appeal.project.status !== "UNDER_APPEAL") {
            throw new Error(`Appeal cannot be resolved while protocol is ${appeal.project.status}`);
        }

        const now = new Date();
        const newProjectStatus = input.decision === "UPHELD" ? "APPROVED" : "APPEAL_RESOLVED";
        const updatedAppeal = await tx.appeal.updateMany({
            where: {
                projectId: input.projectId,
                status: "PENDING",
                project: { deleted: false, status: "UNDER_APPEAL" },
            },
            data: {
                status: input.decision,
                decision: input.decisionText,
                decisionDate: now,
            },
        });
        const updatedProject = await tx.project.updateMany({
            where: { id: input.projectId, deleted: false, status: "UNDER_APPEAL" },
            data: { status: newProjectStatus },
        });
        if (updatedAppeal.count !== 1 || updatedProject.count !== 1) {
            throw new Error("Appeal changed concurrently; please retry");
        }

        await tx.projectStatusHistory.create({
            data: {
                projectId: input.projectId,
                status: newProjectStatus,
                changedBy: session.user.id,
                comment: `Appeal ${input.decision.toLowerCase()}: ${input.decisionText}`,
            },
        });
        await tx.notification.create({
            data: {
                type: "PROJECT_STATUS",
                message: `Your appeal for protocol "${appeal.project.title}" has been ${input.decision.toLowerCase()}.`,
                link: `/protocols/${input.projectId}`,
                userId: appeal.project.userId,
            },
        });
        await tx.auditLog.create({
            data: {
                action: `APPEAL_${input.decision}`,
                details: `Appeal ${input.decision.toLowerCase()} for protocol "${appeal.project.title}": ${input.decisionText}`,
                targetId: input.projectId,
                userId: session.user.id,
            },
        });

        return { success: true, decision: input.decision };
    });
}

export async function getProjectAppeal(projectId: string) {
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

    return db.appeal.findUnique({
        where: { projectId: validProjectId },
        include: {
            appellant: { select: { id: true, name: true, email: true } },
        },
    });
}

export async function getPendingAppeals() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "superadmin") {
        throw new Error("Forbidden: Only super-admins can view all appeals");
    }

    return db.appeal.findMany({
        where: { status: "PENDING", project: { deleted: false, status: "UNDER_APPEAL" } },
        include: {
            project: { select: { id: true, title: true, trackingCode: true } },
            appellant: { select: { id: true, name: true, email: true } },
        },
        orderBy: { filedAt: "asc" },
    });
}

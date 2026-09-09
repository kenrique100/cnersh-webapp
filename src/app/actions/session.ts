"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Prisma, ProjectStatus, SessionStatus, SessionType } from "@/generated/prisma";
import { z } from "zod";

const idSchema = z.string().trim().min(1, "Session identifier is required").max(128);
const sessionTypeSchema = z.enum(SessionType);
const sessionStatusSchema = z.enum(SessionStatus);
const createSessionSchema = z.object({
    sessionType: sessionTypeSchema,
    sessionDate: z.string().trim().min(1, "Session date is required"),
    venue: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(10_000).optional(),
}).strict();
const updateSessionSchema = z.object({
    quorumMet: z.boolean().optional(),
    minutes: z.string().trim().max(50_000).optional(),
    notes: z.string().trim().max(10_000).optional(),
}).strict();
const sessionTransitionMatrix: Record<SessionStatus, readonly SessionStatus[]> = {
    SCHEDULED: ["IN_PROGRESS", "POSTPONED", "CANCELLED"],
    POSTPONED: ["SCHEDULED", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
};

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) throw new Error(result.error.issues[0]?.message || "Invalid committee session data");
    return result.data;
}

function parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error(`${field} must be a valid date`);
    return date;
}

async function requireAdmin() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden: Only admins can manage committee sessions");
    }
    return session;
}

export async function createCommitteeSession(data: {
    sessionType: SessionType;
    sessionDate: string;
    venue?: string;
    notes?: string;
}) {
    const session = await requireAdmin();
    const input = parse(createSessionSchema, data);
    const sessionDate = parseDate(input.sessionDate, "Session date");
    if (sessionDate.getTime() <= Date.now()) throw new Error("Session date must be in the future");

    try {
        return await db.$transaction(async (tx) => {
            const existing = await tx.committeeSession.findUnique({
                where: {
                    sessionType_sessionDate: {
                        sessionType: input.sessionType,
                        sessionDate,
                    },
                },
            });
            if (existing) return existing;

            const groups = await tx.reviewAssignment.groupBy({
                by: ["projectId"],
                where: {
                    status: "COMPLETED",
                    evaluationReport: { status: "SUBMITTED" },
                    project: { status: "REVIEW_COMPLETE", deleted: false },
                },
                _count: { _all: true },
            });
            const eligibleProtocolIds = groups
                .filter((group) => (group._count?._all ?? 0) >= 2)
                .map((group) => group.projectId);

            const committeeSession = await tx.committeeSession.create({
                data: {
                    sessionType: input.sessionType,
                    sessionDate,
                    venue: input.venue || null,
                    agenda: eligibleProtocolIds,
                    status: "SCHEDULED",
                    notes: input.notes || null,
                    createdBy: session.user.id,
                },
            });

            if (eligibleProtocolIds.length > 0) {
                const transitioned = await tx.project.updateMany({
                    where: {
                        id: { in: eligibleProtocolIds },
                        deleted: false,
                        status: ProjectStatus.REVIEW_COMPLETE,
                    },
                    data: { status: ProjectStatus.SESSION_SCHEDULED },
                });
                if (transitioned.count !== eligibleProtocolIds.length) {
                    throw new Error("One or more agenda protocols changed concurrently; please retry");
                }
                await tx.projectStatusHistory.createMany({
                    data: eligibleProtocolIds.map((projectId) => ({
                        projectId,
                        status: ProjectStatus.SESSION_SCHEDULED,
                        changedBy: session.user.id,
                        comment: `Scheduled for committee session on ${sessionDate.toLocaleDateString()}`,
                    })),
                });
            }

            await tx.auditLog.create({
                data: {
                    action: "SESSION_CREATED",
                    details: `${input.sessionType} committee session scheduled for ${sessionDate.toLocaleDateString()}. ${eligibleProtocolIds.length} protocols on agenda.`,
                    targetId: committeeSession.id,
                    userId: session.user.id,
                },
            });
            return committeeSession;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
            const existing = await db.committeeSession.findUnique({
                where: {
                    sessionType_sessionDate: {
                        sessionType: input.sessionType,
                        sessionDate,
                    },
                },
            });
            if (existing) return existing;
        }
        throw error;
    }
}

export async function getCommitteeSessions(status?: SessionStatus) {
    await requireAdmin();
    const validStatus = status === undefined ? undefined : parse(sessionStatusSchema, status);
    return db.committeeSession.findMany({
        where: validStatus ? { status: validStatus } : undefined,
        orderBy: { sessionDate: "desc" },
    });
}

export async function updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    data?: { quorumMet?: boolean; minutes?: string; notes?: string }
) {
    const session = await requireAdmin();
    const validSessionId = parse(idSchema, sessionId);
    const validStatus = parse(sessionStatusSchema, status);
    const input = parse(updateSessionSchema, data || {});

    return db.$transaction(async (tx) => {
        const current = await tx.committeeSession.findUnique({ where: { id: validSessionId } });
        if (!current) throw new Error("Committee session not found");
        if (current.status === validStatus) return current;
        if (!sessionTransitionMatrix[current.status].includes(validStatus)) {
            throw new Error(`Illegal committee session transition: ${current.status} to ${validStatus}`);
        }

        if (validStatus === "COMPLETED") {
            const quorumMet = input.quorumMet ?? current.quorumMet;
            const minutes = input.minutes ?? current.minutes;
            if (quorumMet !== true) throw new Error("Quorum must be met before completing a session");
            if (!minutes?.trim()) throw new Error("Session minutes are required before completing a session");
        }

        const changed = await tx.committeeSession.updateMany({
            where: { id: validSessionId, status: current.status },
            data: {
                status: validStatus,
                ...(input.quorumMet !== undefined ? { quorumMet: input.quorumMet } : {}),
                ...(input.minutes !== undefined ? { minutes: input.minutes || null } : {}),
                ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
            },
        });
        if (changed.count !== 1) throw new Error("Committee session changed concurrently; please retry");

        if (validStatus === "CANCELLED" && current.agenda.length > 0) {
            const agendaProjects = await tx.project.findMany({
                where: {
                    id: { in: current.agenda },
                    deleted: false,
                    status: ProjectStatus.SESSION_SCHEDULED,
                },
                select: { id: true },
            });
            const projectIds = agendaProjects.map((project) => project.id);
            if (projectIds.length > 0) {
                const reverted = await tx.project.updateMany({
                    where: {
                        id: { in: projectIds },
                        deleted: false,
                        status: ProjectStatus.SESSION_SCHEDULED,
                    },
                    data: { status: ProjectStatus.REVIEW_COMPLETE },
                });
                if (reverted.count !== projectIds.length) {
                    throw new Error("One or more agenda protocols changed concurrently; please retry");
                }
                await tx.projectStatusHistory.createMany({
                    data: projectIds.map((projectId) => ({
                        projectId,
                        status: ProjectStatus.REVIEW_COMPLETE,
                        changedBy: session.user.id,
                        comment: "Session cancelled - rescheduling required",
                    })),
                });
            }
        }

        await tx.auditLog.create({
            data: {
                action: `SESSION_${validStatus}`,
                details: validStatus === "CANCELLED"
                    ? `Committee session cancelled. ${input.notes || "No reason provided."}`
                    : `Committee session status changed from ${current.status} to ${validStatus}.`,
                targetId: validSessionId,
                userId: session.user.id,
            },
        });
        return tx.committeeSession.findUniqueOrThrow({ where: { id: validSessionId } });
    });
}

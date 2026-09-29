"use server";

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Prisma, ProjectStatus } from "@/generated/prisma";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import {
    reserveIdempotencyKey,
    storeIdempotentResponse,
    releaseIdempotencyKey,
} from "@/lib/idempotency-store";
import { randomBytes, createHash } from "node:crypto";
import { enforceActionRateLimit } from "@/lib/action-rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";
import {
    ACTIVE_ASSIGNMENT_STATUSES,
    autoReassignReviewer,
    getEligibleReviewers,
    getReviewerLoads,
    pickLowestLoadReviewer,
    selectReviewerForProtocol,
} from "@/lib/reviewer-assignment";
import {
    APPROVAL_STATUSES,
    ASSIGNABLE_PROJECT_STATUSES,
    OWNER_MUTABLE_STATUSES,
    OWNER_RESUBMIT_STATUSES,
    isLegalTransition,
    requiresFeedback,
} from "@/lib/status-transitions";

const idSchema = z
    .string()
    .trim()
    .min(1, "Identifier is required")
    .max(128, "Identifier is too long");
const optionalText = (max: number) => z.string().trim().max(max).optional();

const projectInputSchema = z
    .object({
        title: z.string().trim().min(1, "Protocol title is required").max(250),
        description: z
            .string()
            .trim()
            .min(1, "Protocol description is required")
            .max(20_000),
        objectives: optionalText(10_000),
        category: z.string().trim().min(1, "Protocol category is required").max(150),
        location: optionalText(500),
        timeline: optionalText(1_000),
        budget: optionalText(1_000),
        document: optionalText(2_048),
        formData: z.record(z.string(), z.json()).optional(),
    })
    .strict();

const projectUpdateSchema = projectInputSchema
    .omit({ document: true })
    .partial()
    .refine(
        (value) => Object.keys(value).length > 0,
        "At least one field must be provided"
    );

const submitProjectSchema = projectInputSchema
    .extend({ idempotencyKey: z.string().uuid("idempotencyKey must be a valid UUID") })
    .strict();

const projectStatusSchema = z.enum(ProjectStatus);

const ACTIVE_PROTOCOL_STATUSES: readonly ProjectStatus[] = [
    ProjectStatus.SUBMITTED,
    ProjectStatus.PENDING_REVIEW,
    ProjectStatus.UNDER_REVIEW,
    ProjectStatus.REVIEW_COMPLETE,
    ProjectStatus.SESSION_SCHEDULED,
    ProjectStatus.APPROVED,
    ProjectStatus.APPROVED_WITH_CONDITIONS,
];

const PROTOCOL_VALIDITY_MONTHS = 12;
function computeExpiresAt(approvedAt: Date): Date {
    const d = new Date(approvedAt);
    d.setMonth(d.getMonth() + PROTOCOL_VALIDITY_MONTHS);
    return d;
}

function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success)
        throw new Error(result.error.issues[0]?.message || "Invalid input");
    return result.data;
}

function toJsonValue(
    value: Record<string, unknown> | undefined
): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    try {
        return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
        throw new Error("Protocol form data must be JSON serializable");
    }
}

async function generateTrackingCode(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 10; attempt++) {
        const random = randomBytes(4).toString("hex").toUpperCase();
        const code = `CNERSH-${year}-${random}`;
        const existing = await db.project.findUnique({ where: { trackingCode: code } });
        if (!existing) return code;
    }
    const ts = Date.now().toString(36).toUpperCase();
    return `CNERSH-${year}-${ts}`;
}

async function notifyAssignmentEvent(opts: {
    type: "REVIEW_ASSIGNED" | "REVIEW_REASSIGNED";
    userId: string;
    userEmail: string;
    userName: string | null;
    message: string;
    projectId: string;
}) {
    await db.notification.create({
        data: {
            type: opts.type,
            message: opts.message,
            link: `/protocols/${opts.projectId}`,
            userId: opts.userId,
        },
    });
    sendNotificationEmail({
        to: opts.userEmail,
        userName: opts.userName || "Admin",
        notificationMessage: opts.message,
        notificationType: opts.type,
        actionUrl: `/protocols/${opts.projectId}`,
    }).catch((err) =>
        console.error(`Error sending ${opts.type} email:`, err)
    );
}

export interface SubmitProjectInput {
    title: string;
    description: string;
    objectives?: string;
    category: string;
    location?: string;
    timeline?: string;
    budget?: string;
    document?: string;
    formData?: Record<string, unknown>;
    idempotencyKey: string;
}

export interface SubmittedProtocolSummary {
    id: string;
    trackingCode: string;
    title: string;
    status: ProjectStatus;
    createdAt: string;
    updatedAt: string;
}

export type SubmitProjectResult =
    | { success: true; isDuplicate: false; protocol: SubmittedProtocolSummary }
    | {
    success: false;
    isDuplicate: true;
    reason: "existing-active" | "duplicate-title";
    error: string;
    existingProtocolId: string;
    existingProtocolStatus: ProjectStatus;
    existingProtocolTitle: string;
}
    | {
    success: false;
    isDuplicate: false;
    reason: "in-progress" | "validation" | "unauthorized" | "unknown";
    error: string;
};

const SUBMIT_PROJECT_ACTION = "submitProject";

export async function submitProject(
    data: SubmitProjectInput
): Promise<SubmitProjectResult> {
    let session;
    try {
        session = await verifiedAuthSession();
    } catch (err) {
        return {
            success: false,
            isDuplicate: false,
            reason: "unauthorized",
            error: err instanceof Error ? err.message : "Unauthorized",
        };
    }

    let input: z.infer<typeof submitProjectSchema>;
    try {
        input = parseInput(submitProjectSchema, data);
    } catch (err) {
        return {
            success: false,
            isDuplicate: false,
            reason: "validation",
            error: err instanceof Error ? err.message : "Invalid input",
        };
    }

    const userId = session.user.id;
    const { idempotencyKey } = input;

    const reservation = await reserveIdempotencyKey<SubmitProjectResult>({
        key: idempotencyKey,
        userId,
        action: SUBMIT_PROJECT_ACTION,
    });
    if (reservation.status === "completed") return reservation.response;
    if (reservation.status === "in-progress") {
        return {
            success: false,
            isDuplicate: false,
            reason: "in-progress",
            error: "This submission is already being processed. Please wait a moment.",
        };
    }

    try {
        const result = await db.$transaction(
            async (tx) => {
                const existingActive = await tx.project.findFirst({
                    where: {
                        userId,
                        deleted: false,
                        status: { in: [...ACTIVE_PROTOCOL_STATUSES] },
                    },
                    select: { id: true, title: true, status: true },
                    orderBy: { createdAt: "desc" },
                });
                if (existingActive)
                    return { kind: "existing-active" as const, project: existingActive };

                const duplicateTitle = await tx.project.findFirst({
                    where: {
                        userId,
                        deleted: false,
                        title: { equals: input.title, mode: "insensitive" },
                    },
                    select: { id: true, title: true, status: true },
                    orderBy: { createdAt: "desc" },
                });
                if (duplicateTitle)
                    return { kind: "duplicate-title" as const, project: duplicateTitle };

                // Balanced load: pick the lowest-load reviewer, exclude the owner.
                const availableAdmin = await selectReviewerForProtocol({
                    excludeUserIds: [userId],
                    tx,
                });

                const trackingCode = await generateTrackingCode();
                const sanitizedFormData = toJsonValue(input.formData);

                const projectStatus = availableAdmin
                    ? ProjectStatus.PENDING_REVIEW
                    : ProjectStatus.SUBMITTED;
                const statusComment = availableAdmin
                    ? "Protocol submitted and auto-assigned for review"
                    : "Protocol submitted - no reviewer available, pending manual assignment";

                const created = await tx.project.create({
                    data: {
                        trackingCode,
                        title: input.title,
                        description: input.description,
                        objectives: input.objectives || null,
                        category: input.category,
                        location: input.location || null,
                        timeline: input.timeline || null,
                        budget: input.budget || null,
                        document: input.document || null,
                        formData: sanitizedFormData,
                        status: projectStatus,
                        userId,
                        statusHistory: {
                            create: {
                                status: projectStatus,
                                changedBy: userId,
                                comment: statusComment,
                            },
                        },
                    },
                    select: {
                        id: true,
                        trackingCode: true,
                        title: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });

                if (availableAdmin) {
                    await tx.reviewAssignment.create({
                        data: {
                            projectId: created.id,
                            reviewerId: availableAdmin.id,
                            status: "PENDING_COI",
                        },
                    });
                }

                await tx.auditLog.create({
                    data: {
                        action: availableAdmin
                            ? "AUTO_ASSIGN_ON_SUBMIT"
                            : "PROJECT_SUBMITTED",
                        details: availableAdmin
                            ? `Protocol "${created.title}" auto-assigned to ${availableAdmin.name || availableAdmin.email} on submission`
                            : `Protocol "${created.title}" submitted pending reviewer assignment`,
                        targetId: created.id,
                        userId,
                    },
                });

                return { kind: "created" as const, project: created, assignedAdmin: availableAdmin };
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

        let response: SubmitProjectResult;
        if (result.kind === "existing-active") {
            response = {
                success: false,
                isDuplicate: true,
                reason: "existing-active",
                error:
                    "You already have a protocol in the review pipeline. Please edit and resubmit it instead of creating a new one.",
                existingProtocolId: result.project.id,
                existingProtocolStatus: result.project.status,
                existingProtocolTitle: result.project.title,
            };
        } else if (result.kind === "duplicate-title") {
            response = {
                success: false,
                isDuplicate: true,
                reason: "duplicate-title",
                error:
                    "You already have a protocol with this title. Please edit the existing protocol instead.",
                existingProtocolId: result.project.id,
                existingProtocolStatus: result.project.status,
                existingProtocolTitle: result.project.title,
            };
        } else {
            response = {
                success: true,
                isDuplicate: false,
                protocol: {
                    id: result.project.id,
                    trackingCode: result.project.trackingCode,
                    title: result.project.title,
                    status: result.project.status,
                    createdAt: result.project.createdAt.toISOString(),
                    updatedAt: result.project.updatedAt.toISOString(),
                },
            };

            if (result.assignedAdmin) {
                notifyAssignmentEvent({
                    type: "REVIEW_ASSIGNED",
                    userId: result.assignedAdmin.id,
                    userEmail: result.assignedAdmin.email,
                    userName: result.assignedAdmin.name,
                    message: `You have been automatically assigned to review a new protocol: "${result.project.title}"`,
                    projectId: result.project.id,
                }).catch((err) =>
                    console.error("Error notifying auto-assigned reviewer:", err)
                );
            } else {
                notifyAdmins({
                    type: "PROJECT_STATUS",
                    message: `${session.user.name || "A user"} submitted a new protocol: "${result.project.title}" - needs manual reviewer assignment`,
                    link: "/admin/protocol-review",
                    excludeUserId: userId,
                }).catch((err) => console.error("Error notifying admins:", err));
            }
        }

        await storeIdempotentResponse(
            idempotencyKey,
            userId,
            SUBMIT_PROJECT_ACTION,
            response
        );
        return response;
    } catch (error) {
        console.error("[submitProject] failed:", error);
        await releaseIdempotencyKey(
            idempotencyKey,
            userId,
            SUBMIT_PROJECT_ACTION
        ).catch((releaseErr) =>
            console.error("[submitProject] failed to release idempotency key:", releaseErr)
        );
        return {
            success: false,
            isDuplicate: false,
            reason: "unknown",
            error: "Failed to submit protocol. Please try again later.",
        };
    }
}

export async function getProjectById(projectId: string) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            statusHistory: { orderBy: { createdAt: "desc" } },
            reviewAssignments: {
                include: {
                    reviewer: { select: { id: true, name: true, email: true, image: true } },
                    coiDeclaration: { select: { hasCOI: true, declaredAt: true } },
                    evaluationReport: {
                        select: {
                            id: true,
                            status: true,
                            recommendation: true,
                            submittedAt: true,
                        },
                    },
                },
            },
            appeal: {
                select: {
                    id: true,
                    status: true,
                    filedAt: true,
                    deadlineAt: true,
                    decision: true,
                },
            },
            aarApplication: { select: { id: true, status: true, aarRefNumber: true } },
            saeReports: {
                select: {
                    id: true,
                    eventType: true,
                    eventDate: true,
                    reportedAt: true,
                    isLate: true,
                },
            },
        },
    });
    if (!project) return null;

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const isOwner = project.userId === session.user.id;
    const isSuperAdmin = user?.role === "superadmin";
    const isRegularAdmin = user?.role === "admin";
    const callerAssignment = project.reviewAssignments.find(
        (a) => a.reviewerId === session.user.id
    );
    if (callerAssignment?.status === "EXCLUDED" && !isSuperAdmin) {
        throw new Error("Forbidden: Excluded reviewers cannot access this protocol");
    }
    const isAssignedReviewer = project.reviewAssignments.some(
        (a) => a.reviewerId === session.user.id && a.status === "ACTIVE"
    );

    if (!isOwner && !isSuperAdmin && !isAssignedReviewer && !isRegularAdmin) {
        throw new Error("Forbidden");
    }

    // Non-reviewer admins should not see evaluation reports before they are
    // assigned. Superadmins see everything.
    if (isRegularAdmin && !isAssignedReviewer && !isSuperAdmin) {
        return {
            ...project,
            reviewAssignments: project.reviewAssignments.map((a) => ({
                ...a,
                evaluationReport: null,
            })),
        };
    }

    if (isOwner && !isSuperAdmin && !isRegularAdmin) {
        return {
            ...project,
            reviewAssignments: project.reviewAssignments.map((a) => ({
                ...a,
                reviewer: null,
                evaluationReport: null,
            })),
        };
    }

    return project;
}

export async function getUserProjects() {
    const session = await verifiedAuthSession();
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

export const getMyProtocols = getUserProjects;

/**
 * Reviewer's list. Now includes COMPLETED assignments so the reviewer keeps
 * the protocol for life (resubmissions, appeals, AAR, SAE, renewals).
 */
export async function getProtocolsAssignedToMe() {
    const session = await verifiedAuthSession();
    const me = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (me?.role !== "admin" && me?.role !== "superadmin") return [];

    try {
        return await db.project.findMany({
            where: {
                deleted: false,
                userId: { not: session.user.id },
                reviewAssignments: {
                    some: {
                        reviewerId: session.user.id,
                        status: { in: ["PENDING_COI", "ACTIVE", "COMPLETED"] },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
                statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
                reviewAssignments: {
                    where: { reviewerId: session.user.id },
                    select: { id: true, status: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching assigned review protocols:", error);
        return [];
    }
}

export async function getAllProjects(status?: ProjectStatus) {
    const session = await verifiedAuthSession();
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "admin" && user?.role !== "superadmin")
        throw new Error("Forbidden");

    const validStatus =
        status === undefined ? undefined : parseInput(projectStatusSchema, status);
    return db.project.findMany({
        where: { deleted: false, ...(validStatus ? { status: validStatus } : {}) },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            statusHistory: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
    });
}

/**
 * Admin status change. Now restricted to the protocol's current reviewer or
 * the superadmin (P16). Legal transitions live in status-transitions.ts.
 */
export async function updateProjectStatus(
    projectId: string,
    status:
        | "APPROVED"
        | "RESUBMIT"
        | "RETURNED_INCOMPLETE"
        | "APPROVED_WITH_CONDITIONS"
        | "SESSION_SCHEDULED"
        | "PENDING_REVIEW",
    feedback?: string | undefined
) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);
    const validStatus = parseInput(projectStatusSchema, status);
    const validFeedback = parseInput(
        z.string().trim().max(10_000).optional(),
        feedback
    );

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    const isSuperAdmin = user?.role === "superadmin";
    if (user?.role !== "admin" && !isSuperAdmin) throw new Error("Forbidden");

    const currentProject = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { id: true, title: true, userId: true, status: true, feedback: true },
    });
    if (!currentProject) throw new Error("Protocol not found");
    if (currentProject.status === validStatus) return currentProject;

    // P16 — reviewer (or superadmin) only.
    if (!isSuperAdmin) {
        const active = await db.reviewAssignment.findFirst({
            where: {
                projectId: validProjectId,
                reviewerId: session.user.id,
                status: { in: ["PENDING_COI", "ACTIVE", "COMPLETED"] },
            },
            select: { id: true },
        });
        if (!active) {
            throw new Error(
                "Forbidden: Only the protocol's reviewer or a superadmin can change its status"
            );
        }
    }

    if (!isLegalTransition(currentProject.status, validStatus)) {
        throw new Error(
            `Illegal protocol status transition: ${currentProject.status} to ${validStatus}`
        );
    }
    if (requiresFeedback(validStatus) && !validFeedback) {
        throw new Error(`Feedback is required when changing status to ${validStatus}`);
    }

    const statusMessage = `Your protocol "${currentProject.title}" has been ${validStatus
        .toLowerCase()
        .replaceAll("_", " ")}`;
    const isApproval = APPROVAL_STATUSES.includes(validStatus);
    const now = new Date();

    const project = await db.$transaction(async (tx) => {
        const updated = await tx.project.updateMany({
            where: { id: validProjectId, deleted: false, status: currentProject.status },
            data: {
                status: validStatus,
                feedback: validFeedback || null,
                ...(isApproval
                    ? {
                        expiresAt: computeExpiresAt(now),
                        reminderSentAt: null,
                    }
                    : {}),
            },
        });
        if (updated.count !== 1)
            throw new Error("Protocol status changed concurrently; please retry");

        await tx.projectStatusHistory.create({
            data: {
                projectId: validProjectId,
                status: validStatus,
                changedBy: session.user.id,
                comment: validFeedback || `Status changed to ${validStatus}`,
            },
        });
        await tx.notification.create({
            data: {
                type: "PROJECT_STATUS",
                message: statusMessage,
                link: `/protocols/${validProjectId}`,
                userId: currentProject.userId,
            },
        });
        await tx.auditLog.create({
            data: {
                action: `PROJECT_${validStatus}`,
                details: `Protocol "${currentProject.title}" status changed from ${currentProject.status} to ${validStatus}${validFeedback ? `. Feedback: ${validFeedback}` : ""}`,
                targetId: validProjectId,
                userId: session.user.id,
            },
        });

        return tx.project.findUniqueOrThrow({ where: { id: validProjectId } });
    });

    try {
        const projectOwner = await db.user.findUnique({
            where: { id: currentProject.userId },
            select: { email: true, name: true },
        });
        if (projectOwner?.email) {
            sendNotificationEmail({
                to: projectOwner.email,
                userName: projectOwner.name || "User",
                notificationMessage: statusMessage,
                notificationType: "PROJECT_STATUS",
                actionUrl: `/protocols/${validProjectId}`,
            }).catch((err) => console.error("Error sending project status email:", err));
        }
    } catch (error) {
        console.error("Error sending project status email:", error);
    }

    return project;
}

export async function deleteProject(projectId: string) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { userId: true, status: true, title: true },
    });
    if (!project) throw new Error("Protocol not found");
    if (project.userId !== session.user.id)
        throw new Error("Forbidden: Only the protocol owner can delete it");
    if (!OWNER_MUTABLE_STATUSES.includes(project.status)) {
        throw new Error("Submitted protocols cannot be deleted");
    }

    await db.$transaction(async (tx) => {
        const result = await tx.project.updateMany({
            where: {
                id: validProjectId,
                userId: session.user.id,
                deleted: false,
                status: project.status,
            },
            data: { deleted: true },
        });
        if (result.count !== 1)
            throw new Error("Protocol changed concurrently; please retry");
        await tx.auditLog.create({
            data: {
                action: "PROJECT_DELETED",
                details: `Protocol "${project.title}" was deleted by its owner`,
                targetId: validProjectId,
                userId: session.user.id,
            },
        });
    });
    return { success: true };
}

export async function updateProject(
    projectId: string,
    data: {
        title?: string;
        description?: string;
        objectives?: string;
        category?: string;
        location?: string;
        timeline?: string;
        budget?: string;
        formData?: Record<string, unknown>;
    }
) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);
    const input = parseInput(projectUpdateSchema, data);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { userId: true, status: true, title: true },
    });
    if (!project) throw new Error("Protocol not found");
    if (project.userId !== session.user.id)
        throw new Error("Forbidden: Only the protocol owner can edit it");
    if (!OWNER_MUTABLE_STATUSES.includes(project.status)) {
        throw new Error("Submitted protocols cannot be edited");
    }

    const updateData = {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.objectives !== undefined && { objectives: input.objectives || null }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.location !== undefined && { location: input.location || null }),
        ...(input.timeline !== undefined && { timeline: input.timeline || null }),
        ...(input.budget !== undefined && { budget: input.budget || null }),
        ...(input.formData !== undefined && { formData: toJsonValue(input.formData) }),
    };
    return db.$transaction(async (tx) => {
        const result = await tx.project.updateMany({
            where: {
                id: validProjectId,
                userId: session.user.id,
                deleted: false,
                status: project.status,
            },
            data: updateData,
        });
        if (result.count !== 1)
            throw new Error("Protocol changed concurrently; please retry");
        await tx.auditLog.create({
            data: {
                action: "PROJECT_UPDATED",
                details: `Protocol "${project.title}" was edited by its owner`,
                targetId: validProjectId,
                userId: session.user.id,
            },
        });
        return tx.project.findUniqueOrThrow({ where: { id: validProjectId } });
    });
}

/**
 * Owner resubmits a RETURNED_INCOMPLETE or RESUBMIT protocol.
 * - Sticky reviewer for life: goes to the same reviewer, no new COI.
 * - Superadmin owns reassignment; fallback only if no reviewer was ever set.
 */
export async function resubmitProtocol(projectId: string) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { id: true, userId: true, status: true, title: true },
    });
    if (!project) throw new Error("Protocol not found");
    if (project.userId !== session.user.id)
        throw new Error("Forbidden: Only the protocol owner can resubmit");
    if (!OWNER_RESUBMIT_STATUSES.includes(project.status)) {
        throw new Error(
            "Only returned-incomplete or rejected protocols can be resubmitted"
        );
    }

    // Find the sticky reviewer: the last non-excluded assignment on this protocol.
    const sticky = await db.reviewAssignment.findFirst({
        where: {
            projectId: validProjectId,
            status: { in: ["PENDING_COI", "ACTIVE", "COMPLETED"] },
        },
        orderBy: { createdAt: "desc" },
        include: { reviewer: { select: { id: true, name: true, email: true } } },
    });

    const updated = await db.$transaction(
        async (tx) => {
            const claimed = await tx.project.updateMany({
                where: {
                    id: validProjectId,
                    deleted: false,
                    userId: session.user.id,
                    status: project.status,
                },
                data: { status: ProjectStatus.PENDING_REVIEW },
            });
            if (claimed.count !== 1)
                throw new Error("Protocol changed concurrently; please retry");

            await tx.projectStatusHistory.create({
                data: {
                    projectId: validProjectId,
                    status: ProjectStatus.PENDING_REVIEW,
                    changedBy: session.user.id,
                    comment: "Protocol resubmitted for review",
                },
            });
            await tx.auditLog.create({
                data: {
                    action: "PROTOCOL_RESUBMITTED",
                    details: `Protocol "${project.title}" resubmitted by owner`,
                    targetId: validProjectId,
                    userId: session.user.id,
                },
            });

            if (sticky) {
                // Sticky reviewer: reactivate the same reviewer.
                // No new COI declaration needed - the reviewer already cleared it.
                await tx.reviewAssignment.update({
                    where: { id: sticky.id },
                    data: { status: "ACTIVE", reassignedAt: null },
                });
            } else {
                // No reviewer was ever assigned. Pick one now.
                const assigned = await selectReviewerForProtocol({
                    excludeUserIds: [session.user.id],
                    tx,
                });
                if (assigned) {
                    await tx.reviewAssignment.create({
                        data: {
                            projectId: validProjectId,
                            reviewerId: assigned.id,
                            status: "PENDING_COI",
                        },
                    });
                }
            }

            return tx.project.findUniqueOrThrow({
                where: { id: validProjectId },
                select: { id: true, status: true, title: true, updatedAt: true },
            });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (sticky?.reviewer) {
        notifyAssignmentEvent({
            type: "REVIEW_ASSIGNED",
            userId: sticky.reviewer.id,
            userEmail: sticky.reviewer.email,
            userName: sticky.reviewer.name,
            message: `Protocol "${project.title}" has been resubmitted and is back in your queue.`,
            projectId: validProjectId,
        }).catch((err) => console.error("Error notifying reviewer on resubmit:", err));
    } else {
        notifyAdmins({
            type: "PROJECT_STATUS",
            message: `${session.user.name || "A user"} resubmitted protocol "${project.title}" - needs manual reviewer assignment`,
            link: "/admin/protocol-review",
            excludeUserId: session.user.id,
        }).catch((err) => console.error("Error notifying admins:", err));
    }

    return {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
    };
}

export async function forwardProjectToFeed(
    projectId: string,
    data: { content: string; images?: string[]; videos?: string[]; tags?: string[] }
) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);
    const input = parseInput(
        z
            .object({
                content: z.string().trim().min(1).max(10_000),
                images: z.array(z.string().url().max(2_048)).max(20).optional(),
                videos: z.array(z.string().url().max(2_048)).max(10).optional(),
                tags: z.array(z.string().trim().min(1).max(64)).max(30).optional(),
            })
            .strict(),
        data
    );

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { userId: true, title: true },
    });
    if (!project) throw new Error("Protocol not found");

    if (project.userId !== session.user.id) {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
        if (user?.role !== "admin" && user?.role !== "superadmin")
            throw new Error("Forbidden");
    }

    return db.post.create({
        data: {
            content: input.content,
            images: input.images || [],
            videos: input.videos || [],
            tags: input.tags || [],
            userId: session.user.id,
        },
    });
}

export async function getAdminUsers() {
    const session = await verifiedAuthSession();
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "superadmin")
        throw new Error("Forbidden: Only super admins can list admin users");

    const admins = await db.user.findMany({
        where: {
            role: { in: ["admin", "superadmin"] },
            OR: [{ banned: false }, { banned: null }],
        },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            expertiseTags: true,
        },
        orderBy: { name: "asc" },
    });

    const loads = await getReviewerLoads({ reviewerIds: admins.map((a) => a.id) });

    return admins.map((admin) => ({
        ...admin,
        activeAssignmentCount: loads.get(admin.id) ?? 0,
    }));
}

export async function assignProjectReviewer(projectId: string, adminId: string) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);
    const validAdminId = parseInput(idSchema, adminId);

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "superadmin")
        throw new Error("Forbidden: Only super admins can assign reviewers");

    const [admin, project] = await Promise.all([
        db.user.findUnique({
            where: { id: validAdminId },
            select: { id: true, name: true, email: true, role: true, banned: true },
        }),
        db.project.findUnique({
            where: { id: validProjectId, deleted: false },
            include: {
                user: { select: { id: true, name: true, email: true } },
                reviewAssignments: { select: { reviewerId: true, status: true } },
            },
        }),
    ]);

    if (!admin || admin.banned || (admin.role !== "admin" && admin.role !== "superadmin")) {
        throw new Error("Selected user is not an admin");
    }
    if (!project) throw new Error("Protocol not found");
    if (!ASSIGNABLE_PROJECT_STATUSES.includes(project.status)) {
        throw new Error(`Reviewers cannot be assigned while protocol is ${project.status}`);
    }
    if (project.userId === validAdminId)
        throw new Error("Protocol owners cannot review their own protocols");

    const alreadyAssigned = project.reviewAssignments.some(
        (a) => a.reviewerId === validAdminId
    );
    if (alreadyAssigned) {
        throw new Error("This reviewer was already assigned or excluded from this protocol");
    }

    // Only one active assignment at a time; exit existing ones as EXCLUDED.
    const existingActive = await db.reviewAssignment.findFirst({
        where: { projectId: validProjectId, status: { in: ["PENDING_COI", "ACTIVE"] } },
        select: { id: true },
    });

    const updatedProject = await db.$transaction(
        async (tx) => {
            const freshProject = await tx.project.findUnique({
                where: { id: validProjectId, deleted: false },
                select: { id: true, status: true, userId: true },
            });
            if (!freshProject || !ASSIGNABLE_PROJECT_STATUSES.includes(freshProject.status)) {
                throw new Error("Protocol is no longer available for reviewer assignment");
            }
            if (freshProject.userId === validAdminId) {
                throw new Error("Protocol owners cannot review their own protocols");
            }
            if (existingActive) {
                await tx.reviewAssignment.update({
                    where: { id: existingActive.id },
                    data: { status: "EXCLUDED", reassignedAt: new Date() },
                });
            }

            await tx.reviewAssignment.create({
                data: {
                    projectId: validProjectId,
                    reviewerId: validAdminId,
                    status: "PENDING_COI",
                },
            });

            const nextStatus =
                freshProject.status === ProjectStatus.SUBMITTED ||
                freshProject.status === ProjectStatus.RETURNED_INCOMPLETE
                    ? ProjectStatus.PENDING_REVIEW
                    : freshProject.status;
            const projectChanged = await tx.project.updateMany({
                where: {
                    id: validProjectId,
                    deleted: false,
                    status: freshProject.status,
                    userId: freshProject.userId,
                },
                data: { status: nextStatus },
            });
            if (projectChanged.count !== 1) {
                throw new Error("Protocol changed concurrently; please retry");
            }
            if (nextStatus !== freshProject.status) {
                await tx.projectStatusHistory.create({
                    data: {
                        projectId: validProjectId,
                        status: nextStatus,
                        changedBy: session.user.id,
                        comment: "Protocol assigned for review",
                    },
                });
            }
            await tx.auditLog.create({
                data: {
                    action: "ASSIGN_REVIEWER",
                    details: `Assigned ${admin.name || admin.email} to review protocol "${project.title}"`,
                    targetId: validProjectId,
                    userId: session.user.id,
                },
            });
            return tx.project.findUniqueOrThrow({
                where: { id: validProjectId },
                include: { user: { select: { id: true, name: true, email: true } } },
            });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    await notifyAssignmentEvent({
        type: "REVIEW_ASSIGNED",
        userId: validAdminId,
        userEmail: admin.email,
        userName: admin.name,
        message: `You have been assigned to review the protocol: "${updatedProject.title}"`,
        projectId: validProjectId,
    }).catch((error) =>
        console.error("Error notifying assigned reviewer:", error)
    );

    return updatedProject;
}

export async function autoAssignProjectReviewer(projectId: string) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "superadmin")
        throw new Error("Forbidden: Only super admins can auto-assign reviewers");

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        include: {
            user: { select: { id: true, name: true, email: true } },
            reviewAssignments: { select: { reviewerId: true, status: true } },
        },
    });
    if (!project) throw new Error("Protocol not found");
    if (!ASSIGNABLE_PROJECT_STATUSES.includes(project.status)) {
        throw new Error(`Reviewers cannot be assigned while protocol is ${project.status}`);
    }
    const hasActiveAssignment = project.reviewAssignments.some(
        (a) => a.status === "PENDING_COI" || a.status === "ACTIVE"
    );
    if (hasActiveAssignment)
        throw new Error("This protocol already has an active reviewer assignment");

    const unavailableForProject = [
        project.userId,
        ...project.reviewAssignments.map((a) => a.reviewerId),
    ];
    const availableAdmin = await selectReviewerForProtocol({
        excludeUserIds: unavailableForProject,
    });
    if (!availableAdmin)
        throw new Error("No available admin found. All admins are excluded or banned.");

    const updatedProject = await db.$transaction(
        async (tx) => {
            const freshProject = await tx.project.findUnique({
                where: { id: validProjectId, deleted: false },
                select: { status: true, userId: true },
            });
            if (!freshProject || !ASSIGNABLE_PROJECT_STATUSES.includes(freshProject.status)) {
                throw new Error("Protocol is no longer available for reviewer assignment");
            }

            await tx.reviewAssignment.create({
                data: {
                    projectId: validProjectId,
                    reviewerId: availableAdmin.id,
                    status: "PENDING_COI",
                },
            });

            const projectChanged = await tx.project.updateMany({
                where: {
                    id: validProjectId,
                    deleted: false,
                    status: freshProject.status,
                    userId: freshProject.userId,
                },
                data: { status: "PENDING_REVIEW" },
            });
            if (projectChanged.count !== 1) {
                throw new Error("Protocol changed concurrently; please retry");
            }
            if (freshProject.status !== ProjectStatus.PENDING_REVIEW) {
                await tx.projectStatusHistory.create({
                    data: {
                        projectId: validProjectId,
                        status: ProjectStatus.PENDING_REVIEW,
                        changedBy: session.user.id,
                        comment: "Protocol auto-assigned for review",
                    },
                });
            }
            await tx.auditLog.create({
                data: {
                    action: "AUTO_ASSIGN_REVIEWER",
                    details: `Auto-assigned ${availableAdmin.name || availableAdmin.email} to review protocol "${project.title}"`,
                    targetId: validProjectId,
                    userId: session.user.id,
                },
            });
            return tx.project.findUniqueOrThrow({
                where: { id: validProjectId },
                include: { user: { select: { id: true, name: true, email: true } } },
            });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    await notifyAssignmentEvent({
        type: "REVIEW_ASSIGNED",
        userId: availableAdmin.id,
        userEmail: availableAdmin.email,
        userName: availableAdmin.name,
        message: `You have been automatically assigned to review the protocol: "${updatedProject.title}"`,
        projectId: validProjectId,
    }).catch((error) =>
        console.error("Error notifying auto-assigned reviewer:", error)
    );

    return updatedProject;
}

export async function reassignProjectReviewer(projectId: string, reason?: string) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);
    const validReason = parseInput(
        z.string().trim().min(1).max(2_000).optional(),
        reason
    );

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "superadmin")
        throw new Error("Forbidden: Only super admins can reassign reviewers");

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        include: {
            user: { select: { id: true, name: true, email: true } },
            reviewAssignments: { select: { reviewerId: true } },
        },
    });
    if (!project) throw new Error("Protocol not found");
    if (!ASSIGNABLE_PROJECT_STATUSES.includes(project.status)) {
        throw new Error(`Reviewers cannot be reassigned while protocol is ${project.status}`);
    }

    const currentAssignment = await db.reviewAssignment.findFirst({
        where: { projectId: validProjectId, status: { in: ["PENDING_COI", "ACTIVE"] } },
        include: { reviewer: { select: { id: true, name: true, email: true } } },
    });
    if (!currentAssignment) throw new Error("No active assignment found to reassign");

    const nextAdmin = await selectReviewerForProtocol({
        excludeUserIds: [
            project.userId,
            ...project.reviewAssignments.map((a) => a.reviewerId),
        ],
    });
    if (!nextAdmin) {
        throw new Error(
            "No available admin found for reassignment. All other admins currently have ongoing review assignments."
        );
    }

    const updatedProject = await db.$transaction(
        async (tx) => {
            const freshProject = await tx.project.findUnique({
                where: { id: validProjectId, deleted: false },
                select: { status: true, userId: true },
            });
            if (!freshProject || !ASSIGNABLE_PROJECT_STATUSES.includes(freshProject.status)) {
                throw new Error("Protocol is no longer available for reviewer reassignment");
            }

            const excluded = await tx.reviewAssignment.updateMany({
                where: {
                    id: currentAssignment.id,
                    status: currentAssignment.status,
                },
                data: { status: "EXCLUDED", reassignedAt: new Date() },
            });
            if (excluded.count !== 1)
                throw new Error("Assignment changed concurrently; please retry");

            await tx.reviewAssignment.create({
                data: {
                    projectId: validProjectId,
                    reviewerId: nextAdmin.id,
                    status: "PENDING_COI",
                    reassignedFromId: currentAssignment.reviewerId,
                },
            });

            await tx.auditLog.create({
                data: {
                    action: "REASSIGN_REVIEWER",
                    details: `Reassigned protocol "${project.title}" from ${currentAssignment.reviewer.name || currentAssignment.reviewer.email} to ${nextAdmin.name || nextAdmin.email}${validReason ? `. Reason: ${validReason}` : ""}`,
                    targetId: validProjectId,
                    userId: session.user.id,
                },
            });
            return tx.project.findUniqueOrThrow({
                where: { id: validProjectId },
                include: { user: { select: { id: true, name: true, email: true } } },
            });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    await Promise.allSettled([
        notifyAssignmentEvent({
            type: "REVIEW_REASSIGNED",
            userId: currentAssignment.reviewer.id,
            userEmail: currentAssignment.reviewer.email,
            userName: currentAssignment.reviewer.name,
            message: `You have been unassigned from the protocol: "${project.title}"${validReason ? `. Reason: ${validReason}` : ""}`,
            projectId: validProjectId,
        }),
        notifyAssignmentEvent({
            type: "REVIEW_REASSIGNED",
            userId: nextAdmin.id,
            userEmail: nextAdmin.email,
            userName: nextAdmin.name,
            message: `You have been assigned to review the protocol: "${project.title}" (reassignment)`,
            projectId: validProjectId,
        }),
    ]);

    return updatedProject;
}

export async function getProjectReviewAssignments(projectId: string) {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "admin" && user?.role !== "superadmin")
        throw new Error("Forbidden");

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { id: true },
    });
    if (!project) throw new Error("Protocol not found");
    const excluded = await db.reviewAssignment.findFirst({
        where: {
            projectId: validProjectId,
            reviewerId: session.user.id,
            status: "EXCLUDED",
        },
        select: { id: true },
    });
    if (excluded && user.role !== "superadmin") {
        throw new Error("Forbidden: Excluded reviewers cannot access review assignments");
    }

    return db.reviewAssignment.findMany({
        where: { projectId: validProjectId },
        include: {
            reviewer: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    expertiseTags: true,
                },
            },
            coiDeclaration: true,
            evaluationReport: {
                select: {
                    id: true,
                    status: true,
                    recommendation: true,
                    overallScore: true,
                    submittedAt: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });
}

export interface TrackedProtocolSummary {
    trackingCode: string;
    status: ProjectStatus;
    createdAt: string;
    updatedAt: string;
}

export async function trackProjectByCode(
    trackingCode: string
): Promise<TrackedProtocolSummary | null> {
    const parsedCode = z.string().trim().max(100).safeParse(trackingCode);
    if (!parsedCode.success) return null;
    const code = parsedCode.data.toUpperCase();
    if (!code) return null;

    const bucket = createHash("sha256").update(code).digest("hex").slice(0, 16);
    await enforceActionRateLimit(
        `track:${bucket}`,
        RATE_LIMITS.protocolTrack,
        "protocol-track",
        "Too many lookups for this tracking code."
    );

    const project = await db.project.findUnique({
        where: { trackingCode: code },
        select: {
            deleted: true,
            trackingCode: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!project || project.deleted) return null;
    return {
        trackingCode: project.trackingCode,
        status: project.status,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
    };
}

export interface RenewProtocolResult {
    id: string;
    title: string;
    status: ProjectStatus;
    trackingCode: string;
    updatedAt: string;
}

/**
 * Owner-initiated renewal of an EXPIRED protocol.
 * Sticky reviewer: the same reviewer is re-activated if one exists.
 */
export async function renewProtocol(
    projectId: string
): Promise<RenewProtocolResult> {
    const session = await verifiedAuthSession();
    const validProjectId = parseInput(idSchema, projectId);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { id: true, userId: true, status: true, title: true },
    });
    if (!project) throw new Error("Protocol not found");
    if (project.userId !== session.user.id) {
        throw new Error("Forbidden: Only the protocol owner can renew it");
    }
    if (project.status !== ProjectStatus.EXPIRED) {
        throw new Error("Only expired protocols can be renewed");
    }

    const sticky = await db.reviewAssignment.findFirst({
        where: {
            projectId: validProjectId,
            status: { in: ["PENDING_COI", "ACTIVE", "COMPLETED"] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, reviewerId: true },
    });

    const updatedProject = await db.$transaction(
        async (tx) => {
            const fresh = await tx.project.findUnique({
                where: { id: validProjectId, deleted: false },
                select: { status: true, userId: true },
            });
            if (!fresh || fresh.status !== ProjectStatus.EXPIRED) {
                throw new Error("Protocol is no longer available for renewal");
            }

            const nextStatus = sticky
                ? ProjectStatus.UNDER_REVIEW
                : ProjectStatus.SUBMITTED;

            const claimed = await tx.project.updateMany({
                where: {
                    id: validProjectId,
                    deleted: false,
                    status: ProjectStatus.EXPIRED,
                    userId: session.user.id,
                },
                data: {
                    status: nextStatus,
                    expiresAt: null,
                    reminderSentAt: null,
                },
            });
            if (claimed.count !== 1) {
                throw new Error("Protocol changed concurrently; please retry");
            }

            if (sticky) {
                await tx.reviewAssignment.update({
                    where: { id: sticky.id },
                    data: { status: "ACTIVE", reassignedAt: null },
                });
            } else {
                const assigned = await selectReviewerForProtocol({
                    excludeUserIds: [session.user.id],
                    tx,
                });
                if (assigned) {
                    await tx.reviewAssignment.create({
                        data: {
                            projectId: validProjectId,
                            reviewerId: assigned.id,
                            status: "PENDING_COI",
                        },
                    });
                }
            }

            await tx.projectStatusHistory.create({
                data: {
                    projectId: validProjectId,
                    status: nextStatus,
                    changedBy: session.user.id,
                    comment: sticky
                        ? "Protocol renewed and returned to the same reviewer"
                        : "Protocol renewed - pending reviewer assignment",
                },
            });

            await tx.auditLog.create({
                data: {
                    action: "PROTOCOL_RENEWED",
                    details: `Protocol "${project.title}" renewed`,
                    targetId: validProjectId,
                    userId: session.user.id,
                },
            });

            return tx.project.findUniqueOrThrow({
                where: { id: validProjectId },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    trackingCode: true,
                    updatedAt: true,
                },
            });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return {
        id: updatedProject.id,
        title: updatedProject.title,
        status: updatedProject.status,
        trackingCode: updatedProject.trackingCode,
        updatedAt: updatedProject.updatedAt.toISOString(),
    };
}
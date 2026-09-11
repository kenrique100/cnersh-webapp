"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Prisma, ProjectStatus } from "@/generated/prisma";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { randomBytes } from "crypto";
import { z } from "zod";

const idSchema = z.string().trim().min(1, "Identifier is required").max(128, "Identifier is too long");
const optionalText = (max: number) => z.string().trim().max(max).optional();
const projectInputSchema = z.object({
    title: z.string().trim().min(1, "Protocol title is required").max(250),
    description: z.string().trim().min(1, "Protocol description is required").max(20_000),
    objectives: optionalText(10_000),
    category: z.string().trim().min(1, "Protocol category is required").max(150),
    location: optionalText(500),
    timeline: optionalText(1_000),
    budget: optionalText(1_000),
    document: optionalText(2_048),
    formData: z.record(z.string(), z.json()).optional(),
}).strict();
const projectUpdateSchema = projectInputSchema
    .omit({ document: true })
    .partial()
    .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

const projectStatusSchema = z.enum(ProjectStatus);
const ownerMutableStatuses = new Set<ProjectStatus>([
    ProjectStatus.DRAFT,
    ProjectStatus.RETURNED_INCOMPLETE,
]);
const assignableProjectStatuses = new Set<ProjectStatus>([
    ProjectStatus.SUBMITTED,
    ProjectStatus.RETURNED_INCOMPLETE,
    ProjectStatus.PENDING_REVIEW,
    ProjectStatus.UNDER_REVIEW,
]);
const projectTransitionMatrix: Partial<Record<ProjectStatus, readonly ProjectStatus[]>> = {
    [ProjectStatus.SUBMITTED]: [ProjectStatus.RETURNED_INCOMPLETE, ProjectStatus.PENDING_REVIEW],
    [ProjectStatus.RETURNED_INCOMPLETE]: [ProjectStatus.PENDING_REVIEW],
    [ProjectStatus.REVIEW_COMPLETE]: [
        ProjectStatus.SESSION_SCHEDULED,
        ProjectStatus.APPROVED,
        ProjectStatus.APPROVED_WITH_CONDITIONS,
        ProjectStatus.RESUBMIT,
    ],
    [ProjectStatus.SESSION_SCHEDULED]: [
        ProjectStatus.APPROVED,
        ProjectStatus.APPROVED_WITH_CONDITIONS,
        ProjectStatus.RESUBMIT,
    ],
};
const feedbackRequiredStatuses = new Set<ProjectStatus>([
    ProjectStatus.RESUBMIT,
    ProjectStatus.RETURNED_INCOMPLETE,
    ProjectStatus.APPROVED_WITH_CONDITIONS,
]);

function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) throw new Error(result.error.issues[0]?.message || "Invalid input");
    return result.data;
}

function toJsonValue(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
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

async function findAvailableAdmin(
    excludeIds: string[] = []
): Promise<{ id: string; name: string | null; email: string } | null> {
    const busyRows = await db.reviewAssignment.findMany({
        where: { status: { in: ["PENDING_COI", "ACTIVE"] } },
        select: { reviewerId: true },
    });
    const busyIds = busyRows.map((r) => r.reviewerId);
    const allExcluded = [...new Set([...busyIds, ...excludeIds])];

    return db.user.findFirst({
        where: {
            role: { in: ["admin", "superadmin"] },
            OR: [{ banned: false }, { banned: null }],
            id: { notIn: allExcluded },
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
    });
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
    }).catch((err) => console.error(`Error sending ${opts.type} email:`, err));
}

// ─── Public Actions ───────────────────────────────────────────────────────────

export async function submitProject(data: {
    title: string;
    description: string;
    objectives?: string;
    category: string;
    location?: string;
    timeline?: string;
    budget?: string;
    document?: string;
    formData?: Record<string, unknown>;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const input = parseInput(projectInputSchema, data);

    try {
        // Submitters, including admins, must pass through the normal review workflow.
        const availableAdmin = await findAvailableAdmin([session.user.id]);
        const trackingCode = await generateTrackingCode();
        const sanitizedFormData = toJsonValue(input.formData);

        // Create project + auto-assignment in one transaction
        const transactionResult = await db.$transaction(async (tx) => {
            const reviewerConflict = availableAdmin
                ? await tx.reviewAssignment.findFirst({
                    where: {
                        reviewerId: availableAdmin.id,
                        status: { in: ["PENDING_COI", "ACTIVE"] },
                    },
                    select: { id: true },
                })
                : null;
            const assignedAdmin = reviewerConflict ? null : availableAdmin;
            const projectStatus = assignedAdmin ? ProjectStatus.PENDING_REVIEW : ProjectStatus.SUBMITTED;
            const statusComment = assignedAdmin
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
                    userId: session.user.id,
                    // If auto-assigning, set assignedToId immediately
                    ...(assignedAdmin ? { assignedToId: assignedAdmin.id } : {}),
                    statusHistory: {
                        create: {
                            status: projectStatus,
                            changedBy: session.user.id,
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

            // Create the review assignment immediately if an admin is available
            if (assignedAdmin) {
                await tx.reviewAssignment.create({
                    data: {
                        projectId: created.id,
                        reviewerId: assignedAdmin.id,
                        status: "PENDING_COI",
                    },
                });
            }

            await tx.auditLog.create({
                data: {
                    action: assignedAdmin ? "AUTO_ASSIGN_ON_SUBMIT" : "PROJECT_SUBMITTED",
                    details: assignedAdmin
                        ? `Protocol "${created.title}" auto-assigned to ${assignedAdmin.name || assignedAdmin.email} on submission`
                        : `Protocol "${created.title}" submitted pending reviewer assignment`,
                    targetId: created.id,
                    userId: session.user.id,
                },
            });

            return { project: created, assignedAdmin };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        const { project, assignedAdmin } = transactionResult;

        // Fire-and-forget notifications (outside transaction)
        if (assignedAdmin) {
            // Notify the assigned reviewer
            notifyAssignmentEvent({
                type: "REVIEW_ASSIGNED",
                userId: assignedAdmin.id,
                userEmail: assignedAdmin.email,
                userName: assignedAdmin.name,
                message: `You have been automatically assigned to review a new protocol: "${project.title}"`,
                projectId: project.id,
            }).catch((err) => console.error("Error notifying auto-assigned reviewer:", err));

            // Also notify all admins that a new protocol came in (so others are aware)
            notifyAdmins({
                type: "PROJECT_STATUS",
                message: `${session.user.name || "A user"} submitted a new protocol: "${project.title}" - auto-assigned to ${assignedAdmin.name || assignedAdmin.email}`,
                link: `/admin/protocol-review`,
                excludeUserId: session.user.id,
            }).catch((err) => console.error("Error notifying admins:", err));

        } else {
            // No admin available - notify admins to assign manually
            notifyAdmins({
                type: "PROJECT_STATUS",
                message: `${session.user.name || "A user"} submitted a new protocol: "${project.title}" - needs manual reviewer assignment`,
                link: `/admin/protocol-review`,
                excludeUserId: session.user.id,
            }).catch((err) => console.error("Error notifying admins:", err));
        }

        return {
            id: project.id,
            trackingCode: project.trackingCode,
            title: project.title,
            status: project.status,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
        };
    } catch (error) {
        console.error("Error submitting protocol:", error);
        throw new Error("Failed to submit protocol. Please try again later.");
    }
}

export async function getProjectById(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parseInput(idSchema, projectId);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            statusHistory: { orderBy: { createdAt: "desc" } },
            reviewAssignments: {
                include: {
                    reviewer: { select: { id: true, name: true, email: true, image: true } },
                    coiDeclaration: { select: { hasCOI: true, declaredAt: true } },
                    evaluationReport: {
                        select: { id: true, status: true, recommendation: true, submittedAt: true },
                    },
                },
            },
            appeal: { select: { id: true, status: true, filedAt: true, deadlineAt: true, decision: true } },
            aarApplication: { select: { id: true, status: true, aarRefNumber: true } },
            saeReports: { select: { id: true, eventType: true, eventDate: true, reportedAt: true, isLate: true } },
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
        (assignment) => assignment.reviewerId === session.user.id
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
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    try {
        return await db.project.findMany({
            where: { userId: session.user.id, deleted: false },
            orderBy: { createdAt: "desc" },
            include: { statusHistory: { orderBy: { createdAt: "desc" }, take: 1 } },
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
    if (user?.role !== "admin" && user?.role !== "superadmin") throw new Error("Forbidden");

    const validStatus = status === undefined ? undefined : parseInput(projectStatusSchema, status);
    return db.project.findMany({
        where: { deleted: false, ...(validStatus ? { status: validStatus } : {}) },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            statusHistory: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function updateProjectStatus(projectId: string, status: "APPROVED" | "RESUBMIT" | "RETURNED_INCOMPLETE" | "APPROVED_WITH_CONDITIONS" | "SESSION_SCHEDULED" | "PENDING_REVIEW", feedback?: string | undefined) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parseInput(idSchema, projectId);
    const validStatus = parseInput(projectStatusSchema, status);
    const validFeedback = parseInput(z.string().trim().max(10_000).optional(), feedback);

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "admin" && user?.role !== "superadmin") throw new Error("Forbidden");

    const currentProject = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { id: true, title: true, userId: true, status: true, feedback: true },
    });
    if (!currentProject) throw new Error("Protocol not found");
    if (currentProject.status === validStatus) return currentProject;

    const legalTargets = projectTransitionMatrix[currentProject.status] || [];
    if (!legalTargets.includes(validStatus)) {
        throw new Error(`Illegal protocol status transition: ${currentProject.status} to ${validStatus}`);
    }
    if (feedbackRequiredStatuses.has(validStatus) && !validFeedback) {
        throw new Error(`Feedback is required when changing status to ${validStatus}`);
    }

    const statusMessage = `Your protocol "${currentProject.title}" has been ${validStatus.toLowerCase().replaceAll("_", " ")}`;
    const project = await db.$transaction(async (tx) => {
        const updated = await tx.project.updateMany({
            where: { id: validProjectId, deleted: false, status: currentProject.status },
            data: { status: validStatus, feedback: validFeedback || null },
        });
        if (updated.count !== 1) throw new Error("Protocol status changed concurrently; please retry");

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
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parseInput(idSchema, projectId);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { userId: true, status: true, title: true },
    });
    if (!project) throw new Error("Protocol not found");
    if (project.userId !== session.user.id) throw new Error("Forbidden: Only the protocol owner can delete it");
    if (!ownerMutableStatuses.has(project.status)) {
        throw new Error("Submitted protocols cannot be deleted");
    }

    await db.$transaction(async (tx) => {
        const result = await tx.project.updateMany({
            where: { id: validProjectId, userId: session.user.id, deleted: false, status: project.status },
            data: { deleted: true },
        });
        if (result.count !== 1) throw new Error("Protocol changed concurrently; please retry");
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
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parseInput(idSchema, projectId);
    const input = parseInput(projectUpdateSchema, data);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { userId: true, status: true, title: true },
    });
    if (!project) throw new Error("Protocol not found");
    if (project.userId !== session.user.id) throw new Error("Forbidden: Only the protocol owner can edit it");
    if (!ownerMutableStatuses.has(project.status)) {
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
        if (result.count !== 1) throw new Error("Protocol changed concurrently; please retry");
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

export async function forwardProjectToFeed(
    projectId: string,
    data: { content: string; images?: string[]; videos?: string[]; tags?: string[] }
) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parseInput(idSchema, projectId);
    const input = parseInput(z.object({
        content: z.string().trim().min(1).max(10_000),
        images: z.array(z.string().url().max(2_048)).max(20).optional(),
        videos: z.array(z.string().url().max(2_048)).max(10).optional(),
        tags: z.array(z.string().trim().min(1).max(64)).max(30).optional(),
    }).strict(), data);

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { userId: true, title: true },
    });
    if (!project) throw new Error("Protocol not found");

    if (project.userId !== session.user.id) {
        const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
        if (user?.role !== "admin" && user?.role !== "superadmin") throw new Error("Forbidden");
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
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "superadmin") throw new Error("Forbidden: Only super admins can list admin users");

    const admins = await db.user.findMany({
        where: { role: { in: ["admin", "superadmin"] }, OR: [{ banned: false }, { banned: null }] },
        select: { id: true, name: true, email: true, image: true, role: true, expertiseTags: true },
        orderBy: { name: "asc" },
    });

    const busyRows = await db.reviewAssignment.findMany({
        where: { status: { in: ["PENDING_COI", "ACTIVE"] } },
        select: { reviewerId: true },
    });
    const busyCounts = busyRows.reduce<Record<string, number>>((acc, r) => {
        acc[r.reviewerId] = (acc[r.reviewerId] || 0) + 1;
        return acc;
    }, {});

    return admins.map((admin) => ({
        ...admin,
        activeAssignmentCount: busyCounts[admin.id] || 0,
        isAvailable: !busyCounts[admin.id],
    }));
}

export async function assignProjectReviewer(projectId: string, adminId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parseInput(idSchema, projectId);
    const validAdminId = parseInput(idSchema, adminId);

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "superadmin") throw new Error("Forbidden: Only super admins can assign reviewers");

    const [admin, project, activeWork] = await Promise.all([
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
        db.reviewAssignment.findFirst({
            where: { reviewerId: validAdminId, status: { in: ["PENDING_COI", "ACTIVE"] } },
            select: { id: true },
        }),
    ]);

    if (!admin || admin.banned || (admin.role !== "admin" && admin.role !== "superadmin")) {
        throw new Error("Selected user is not an admin");
    }
    if (!project) throw new Error("Protocol not found");
    if (!assignableProjectStatuses.has(project.status)) {
        throw new Error(`Reviewers cannot be assigned while protocol is ${project.status}`);
    }
    if (project.userId === validAdminId) throw new Error("Protocol owners cannot review their own protocols");
    if (activeWork) throw new Error("This reviewer already has an active review assignment");

    const alreadyAssigned = project.reviewAssignments.some((a) => a.reviewerId === validAdminId);
    if (alreadyAssigned) {
        throw new Error("This reviewer was already assigned or excluded from this protocol");
    }

    const updatedProject = await db.$transaction(async (tx) => {
        const freshProject = await tx.project.findUnique({
            where: { id: validProjectId, deleted: false },
            select: { id: true, status: true, userId: true },
        });
        if (!freshProject || !assignableProjectStatuses.has(freshProject.status)) {
            throw new Error("Protocol is no longer available for reviewer assignment");
        }
        if (freshProject.userId === validAdminId) {
            throw new Error("Protocol owners cannot review their own protocols");
        }
        const conflictingAssignment = await tx.reviewAssignment.findFirst({
            where: {
                OR: [
                    { projectId: validProjectId, reviewerId: validAdminId },
                    { reviewerId: validAdminId, status: { in: ["PENDING_COI", "ACTIVE"] } },
                ],
            },
            select: { id: true },
        });
        if (conflictingAssignment) throw new Error("Reviewer is no longer available");

        await tx.reviewAssignment.create({
            data: { projectId: validProjectId, reviewerId: validAdminId, status: "PENDING_COI" },
        });

        const nextStatus = freshProject.status === ProjectStatus.SUBMITTED
            || freshProject.status === ProjectStatus.RETURNED_INCOMPLETE
            ? ProjectStatus.PENDING_REVIEW
            : freshProject.status;
        const projectChanged = await tx.project.updateMany({
            where: {
                id: validProjectId,
                deleted: false,
                status: freshProject.status,
                userId: freshProject.userId,
            },
            data: {
                assignedToId: validAdminId,
                status: nextStatus,
            },
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await notifyAssignmentEvent({
        type: "REVIEW_ASSIGNED",
        userId: validAdminId,
        userEmail: admin.email,
        userName: admin.name,
        message: `You have been assigned to review the protocol: "${updatedProject.title}"`,
        projectId: validProjectId,
    }).catch((error) => console.error("Error notifying assigned reviewer:", error));

    return updatedProject;
}

export async function autoAssignProjectReviewer(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parseInput(idSchema, projectId);

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "superadmin") throw new Error("Forbidden: Only super admins can auto-assign reviewers");

    try {
        const project = await db.project.findUnique({
            where: { id: validProjectId, deleted: false },
            include: {
                user: { select: { id: true, name: true, email: true } },
                reviewAssignments: { select: { reviewerId: true, status: true } },
            },
        });
        if (!project) throw new Error("Protocol not found");
        if (!assignableProjectStatuses.has(project.status)) {
            throw new Error(`Reviewers cannot be assigned while protocol is ${project.status}`);
        }

        const hasActiveAssignment = project.reviewAssignments.some(
            (a) => a.status === "PENDING_COI" || a.status === "ACTIVE"
        );
        if (hasActiveAssignment) throw new Error("This protocol already has an active reviewer assignment");

        const unavailableForProject = [
            project.userId,
            ...project.reviewAssignments.map((assignment) => assignment.reviewerId),
        ];
        const availableAdmin = await findAvailableAdmin(unavailableForProject);
        if (!availableAdmin) throw new Error("No available admin found. All admins currently have ongoing review assignments.");

        const updatedProject = await db.$transaction(async (tx) => {
            const freshProject = await tx.project.findUnique({
                where: { id: validProjectId, deleted: false },
                select: { status: true, userId: true },
            });
            if (!freshProject || !assignableProjectStatuses.has(freshProject.status)) {
                throw new Error("Protocol is no longer available for reviewer assignment");
            }
            if (freshProject.userId === availableAdmin.id) {
                throw new Error("Protocol owners cannot review their own protocols");
            }
            const conflict = await tx.reviewAssignment.findFirst({
                where: {
                    OR: [
                        { projectId: validProjectId, status: { in: ["PENDING_COI", "ACTIVE"] } },
                        { projectId: validProjectId, reviewerId: availableAdmin.id },
                        { reviewerId: availableAdmin.id, status: { in: ["PENDING_COI", "ACTIVE"] } },
                    ],
                },
                select: { id: true },
            });
            if (conflict) throw new Error("Reviewer or protocol is no longer available");

            await tx.reviewAssignment.create({
                data: { projectId: validProjectId, reviewerId: availableAdmin.id, status: "PENDING_COI" },
            });

            const projectChanged = await tx.project.updateMany({
                where: {
                    id: validProjectId,
                    deleted: false,
                    status: freshProject.status,
                    userId: freshProject.userId,
                },
                data: {
                    assignedToId: availableAdmin.id,
                    status: "PENDING_REVIEW",
                },
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
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        await notifyAssignmentEvent({
            type: "REVIEW_ASSIGNED",
            userId: availableAdmin.id,
            userEmail: availableAdmin.email,
            userName: availableAdmin.name,
            message: `You have been automatically assigned to review the protocol: "${updatedProject.title}"`,
            projectId: validProjectId,
        }).catch((error) => console.error("Error notifying auto-assigned reviewer:", error));

        return updatedProject;
    } catch (error) {
        console.error("[autoAssignProjectReviewer] ERROR:", error);
        throw error;
    }
}

export async function reassignProjectReviewer(projectId: string, reason?: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parseInput(idSchema, projectId);
    const validReason = parseInput(z.string().trim().min(1).max(2_000).optional(), reason);

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "superadmin") throw new Error("Forbidden: Only super admins can reassign reviewers");

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        include: {
            user: { select: { id: true, name: true, email: true } },
            reviewAssignments: { select: { reviewerId: true } },
        },
    });
    if (!project) throw new Error("Protocol not found");
    if (!assignableProjectStatuses.has(project.status)) {
        throw new Error(`Reviewers cannot be reassigned while protocol is ${project.status}`);
    }

    const currentAssignment = await db.reviewAssignment.findFirst({
        where: { projectId: validProjectId, status: { in: ["PENDING_COI", "ACTIVE"] } },
        include: { reviewer: { select: { id: true, name: true, email: true } } },
    });
    if (!currentAssignment) throw new Error("No active assignment found to reassign");

    const nextAdmin = await findAvailableAdmin([
        project.userId,
        ...project.reviewAssignments.map((assignment) => assignment.reviewerId),
    ]);
    if (!nextAdmin) {
        throw new Error(
            "No available admin found for reassignment. All other admins currently have ongoing review assignments."
        );
    }

    const updatedProject = await db.$transaction(async (tx) => {
        const freshProject = await tx.project.findUnique({
            where: { id: validProjectId, deleted: false },
            select: { status: true, userId: true },
        });
        if (!freshProject || !assignableProjectStatuses.has(freshProject.status)) {
            throw new Error("Protocol is no longer available for reviewer reassignment");
        }
        if (freshProject.userId === nextAdmin.id) {
            throw new Error("Protocol owners cannot review their own protocols");
        }

        const excluded = await tx.reviewAssignment.updateMany({
            where: {
                id: currentAssignment.id,
                projectId: validProjectId,
                reviewerId: currentAssignment.reviewerId,
                status: currentAssignment.status,
            },
            data: { status: "EXCLUDED", reassignedAt: new Date() },
        });
        if (excluded.count !== 1) throw new Error("Assignment changed concurrently; please retry");

        const conflict = await tx.reviewAssignment.findFirst({
            where: {
                OR: [
                    { projectId: validProjectId, reviewerId: nextAdmin.id },
                    { reviewerId: nextAdmin.id, status: { in: ["PENDING_COI", "ACTIVE"] } },
                ],
            },
            select: { id: true },
        });
        if (conflict) throw new Error("Replacement reviewer is no longer available");

        await tx.reviewAssignment.create({
            data: {
                projectId: validProjectId,
                reviewerId: nextAdmin.id,
                status: "PENDING_COI",
                reassignedFromId: currentAssignment.reviewerId,
            },
        });

        const projectChanged = await tx.project.updateMany({
            where: {
                id: validProjectId,
                deleted: false,
                status: freshProject.status,
                userId: freshProject.userId,
            },
            data: {
                assignedToId: nextAdmin.id,
            },
        });
        if (projectChanged.count !== 1) {
            throw new Error("Protocol changed concurrently; please retry");
        }
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

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
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parseInput(idSchema, projectId);

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "admin" && user?.role !== "superadmin") throw new Error("Forbidden");

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
            reviewer: { select: { id: true, name: true, email: true, image: true, expertiseTags: true } },
            coiDeclaration: true,
            evaluationReport: {
                select: { id: true, status: true, recommendation: true, overallScore: true, submittedAt: true },
            },
        },
        orderBy: { createdAt: "asc" },
    });
}

export async function trackProjectByCode(trackingCode: string) {
    const parsedCode = z.string().trim().max(100).safeParse(trackingCode);
    if (!parsedCode.success) return null;
    const code = parsedCode.data.toUpperCase();
    if (!code) return null;

    const project = await db.project.findUnique({
        where: { trackingCode: code },
        select: {
            deleted: true,
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
                select: { status: true, comment: true, createdAt: true },
            },
        },
    });

    if (!project || project.deleted) return null;
    return {
        id: project.id,
        trackingCode: project.trackingCode,
        title: project.title,
        category: project.category,
        location: project.location,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        statusHistory: project.statusHistory,
    };
}

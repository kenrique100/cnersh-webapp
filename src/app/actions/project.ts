"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Prisma, ProjectStatus } from "@/generated/prisma";
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
    formData?: Record<string, unknown>;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    // Validate required fields before database call
    if (!data.title || data.title.trim().length === 0) {
        throw new Error("Protocol title is required");
    }
    if (!data.description || data.description.trim().length === 0) {
        throw new Error("Protocol description is required");
    }
    if (!data.category || data.category.trim().length === 0) {
        throw new Error("Protocol category is required");
    }

    try {
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

        // Sanitize formData to ensure it's a valid JSON value for Prisma
        let sanitizedFormData: Prisma.InputJsonValue | undefined;
        if (data.formData) {
            try {
                sanitizedFormData = JSON.parse(JSON.stringify(data.formData)) as Prisma.InputJsonValue;
            } catch (sanitizeError) {
                console.error("Failed to sanitize formData, storing without formData:", sanitizeError);
                sanitizedFormData = undefined;
            }
        }

        const project = await db.project.create({
            data: {
                trackingCode,
                title: data.title.trim(),
                description: data.description.trim(),
                objectives: data.objectives?.trim() || null,
                category: data.category.trim(),
                location: data.location?.trim() || null,
                timeline: data.timeline?.trim() || null,
                budget: data.budget?.trim() || null,
                document: data.document?.trim() || null,
                formData: sanitizedFormData,
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
            select: {
                id: true,
                trackingCode: true,
                title: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // Notify admins about new project submission (only for non-admin users)
        if (!isAdmin) {
            try {
                await notifyAdmins({
                    type: "PROJECT_STATUS",
                    message: `${session.user.name || "A user"} submitted a new protocol: "${project.title}"`,
                    link: `/admin/protocol-review`,
                    excludeUserId: session.user.id,
                });
            } catch (error) {
                console.error("Error notifying admins about project submission:", error);
            }
        }

        // Return a plain serializable object
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

    const project = await db.project.findUnique({
        where: { id: projectId, deleted: false },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            statusHistory: {
                orderBy: { createdAt: "desc" },
            },
            reviewAssignments: {
                include: {
                    reviewer: { select: { id: true, name: true, email: true, image: true } },
                    coiDeclaration: { select: { hasCOI: true, declaredAt: true } },
                    evaluationReport: { select: { id: true, status: true, recommendation: true, submittedAt: true } },
                },
            },
            appeal: { select: { id: true, status: true, filedAt: true, deadlineAt: true, decision: true } },
            aarApplication: { select: { id: true, status: true, aarRefNumber: true } },
            saeReports: { select: { id: true, eventType: true, eventDate: true, reportedAt: true, isLate: true } },
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
    // Also allow assigned reviewers to view (only after COI cleared)
    const isAssignedReviewer = project.reviewAssignments.some(
        (a) => a.reviewerId === session.user.id && a.status === "ACTIVE"
    );

    if (!isOwner && !isAdmin && !isAssignedReviewer) throw new Error("Forbidden");

    // If user is the PI, hide reviewer names until status is confirmed
    // Never expose reviewer evaluation scores/comments to PI
    if (isOwner && !isAdmin) {
        return {
            ...project,
            reviewAssignments: project.reviewAssignments.map((a) => ({
                ...a,
                reviewer: null, // Hide reviewer identity from PI
                evaluationReport: null, // Never show evaluation details to PI
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
            link: `/protocols/${projectId}`,
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
                actionUrl: `/protocols/${projectId}`,
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
    formData?: Record<string, unknown>;
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
            ...(data.formData !== undefined && { formData: data.formData as Prisma.InputJsonValue }),
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
        select: { id: true, name: true, email: true, image: true, role: true, expertiseTags: true },
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

    const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
            user: { select: { id: true, name: true, email: true } },
            reviewAssignments: { select: { reviewerId: true } },
        },
    });

    if (!project) throw new Error("Protocol not found");

    // Check if this reviewer is already assigned
    const alreadyAssigned = project.reviewAssignments.some((a) => a.reviewerId === adminId);
    if (alreadyAssigned) {
        throw new Error("This reviewer is already assigned to this protocol");
    }

    // Create the ReviewAssignment record
    await db.reviewAssignment.create({
        data: {
            projectId,
            reviewerId: adminId,
            status: "PENDING_COI",
        },
    });

    // Update the project legacy assignedToId (for backward compat) and status
    const updatedProject = await db.project.update({
        where: { id: projectId },
        data: {
            assignedToId: adminId,
            status: "PENDING_REVIEW",
            statusHistory: {
                create: {
                    status: "PENDING_REVIEW",
                    changedBy: session.user.id,
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
            message: `You have been assigned to review the protocol: "${updatedProject.title}"`,
            link: `/protocols/${projectId}`,
            userId: adminId,
        },
    });

    // Send email notification to the assigned admin
    try {
        if (admin.email) {
            sendNotificationEmail({
                to: admin.email,
                userName: admin.name || "Admin",
                notificationMessage: `You have been assigned to review the protocol: "${updatedProject.title}" submitted by ${updatedProject.user.name || "a user"}.`,
                notificationType: "REVIEW_ASSIGNED",
                actionUrl: `/protocols/${projectId}`,
            }).catch((err) => console.error("Error sending review assignment email:", err));
        }
    } catch (error) {
        console.error("Error sending review assignment email:", error);
    }

    // Create audit log
    await db.auditLog.create({
        data: {
            action: "ASSIGN_REVIEWER",
            details: `Assigned ${admin.name || admin.email} to review protocol "${updatedProject.title}"`,
            targetId: projectId,
            userId: session.user.id,
        },
    });

    return updatedProject;
}

/**
 * Get all review assignments for a protocol (admin/superadmin only)
 */
export async function getProjectReviewAssignments(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden");
    }

    return db.reviewAssignment.findMany({
        where: { projectId },
        include: {
            reviewer: { select: { id: true, name: true, email: true, image: true, expertiseTags: true } },
            coiDeclaration: true,
            evaluationReport: { select: { id: true, status: true, recommendation: true, overallScore: true, submittedAt: true } },
        },
        orderBy: { createdAt: "asc" },
    });
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

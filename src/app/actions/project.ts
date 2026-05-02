"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Prisma, ProjectStatus } from "@/generated/prisma";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { randomBytes } from "crypto";

// ─── Private Utilities ────────────────────────────────────────────────────────

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

    if (!data.title?.trim()) throw new Error("Protocol title is required");
    if (!data.description?.trim()) throw new Error("Protocol description is required");
    if (!data.category?.trim()) throw new Error("Protocol category is required");

    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
        const isAdmin = user?.role === "admin" || user?.role === "superadmin";

        // Admins get APPROVED immediately; regular users go straight to PENDING_REVIEW
        // if an available admin exists, otherwise fall back to SUBMITTED
        const availableAdmin = isAdmin ? null : await findAvailableAdmin([session.user.id]);
        const projectStatus = isAdmin
            ? ProjectStatus.APPROVED
            : availableAdmin
                ? ProjectStatus.PENDING_REVIEW
                : ProjectStatus.SUBMITTED;

        const statusComment = isAdmin
            ? "Protocol submitted and auto-approved by admin"
            : availableAdmin
                ? "Protocol submitted and auto-assigned for review"
                : "Protocol submitted — no reviewer available, pending manual assignment";

        const trackingCode = await generateTrackingCode();

        let sanitizedFormData: Prisma.InputJsonValue | undefined;
        if (data.formData) {
            try {
                sanitizedFormData = JSON.parse(JSON.stringify(data.formData)) as Prisma.InputJsonValue;
            } catch {
                sanitizedFormData = undefined;
            }
        }

        // Create project + auto-assignment in one transaction
        const project = await db.$transaction(async (tx) => {
            const created = await tx.project.create({
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
                    // If auto-assigning, set assignedToId immediately
                    ...(availableAdmin ? { assignedToId: availableAdmin.id } : {}),
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
            if (availableAdmin) {
                await tx.reviewAssignment.create({
                    data: {
                        projectId: created.id,
                        reviewerId: availableAdmin.id,
                        status: "PENDING_COI",
                    },
                });
            }

            return created;
        });

        // Fire-and-forget notifications (outside transaction)
        if (availableAdmin) {
            // Notify the assigned reviewer
            notifyAssignmentEvent({
                type: "REVIEW_ASSIGNED",
                userId: availableAdmin.id,
                userEmail: availableAdmin.email,
                userName: availableAdmin.name,
                message: `You have been automatically assigned to review a new protocol: "${project.title}"`,
                projectId: project.id,
            }).catch((err) => console.error("Error notifying auto-assigned reviewer:", err));

            // Also notify all admins that a new protocol came in (so others are aware)
            notifyAdmins({
                type: "PROJECT_STATUS",
                message: `${session.user.name || "A user"} submitted a new protocol: "${project.title}" — auto-assigned to ${availableAdmin.name || availableAdmin.email}`,
                link: `/admin/protocol-review`,
                excludeUserId: session.user.id,
            }).catch((err) => console.error("Error notifying admins:", err));

            // Log the auto-assignment
            db.auditLog.create({
                data: {
                    action: "AUTO_ASSIGN_ON_SUBMIT",
                    details: `Protocol "${project.title}" auto-assigned to ${availableAdmin.name || availableAdmin.email} on submission`,
                    targetId: project.id,
                    userId: session.user.id,
                },
            }).catch((err) => console.error("Error writing audit log:", err));

        } else if (!isAdmin) {
            // No admin available — notify admins to assign manually
            notifyAdmins({
                type: "PROJECT_STATUS",
                message: `${session.user.name || "A user"} submitted a new protocol: "${project.title}" — needs manual reviewer assignment`,
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

    const project = await db.project.findUnique({
        where: { id: projectId, deleted: false },
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

    return db.project.findMany({
        where: { deleted: false, ...(status ? { status } : {}) },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            statusHistory: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus, feedback?: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "admin" && user?.role !== "superadmin") throw new Error("Forbidden");

    const project = await db.project.update({
        where: { id: projectId },
        data: {
            status,
            feedback: feedback || null,
            statusHistory: {
                create: { status, changedBy: session.user.id, comment: feedback || `Status changed to ${status}` },
            },
        },
    });

    const statusMessage = `Your protocol "${project.title}" has been ${status.toLowerCase().replace("_", " ")}`;
    await db.notification.create({
        data: { type: "PROJECT_STATUS", message: statusMessage, link: `/protocols/${projectId}`, userId: project.userId },
    });

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
        console.error("Error sending project status email:", error);
    }

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

    const project = await db.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!project) throw new Error("Protocol not found");

    if (project.userId !== session.user.id) {
        const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
        if (user?.role !== "admin" && user?.role !== "superadmin") throw new Error("Forbidden");
    }

    await db.project.update({ where: { id: projectId }, data: { deleted: true } });
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

    const project = await db.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!project) throw new Error("Protocol not found");

    if (project.userId !== session.user.id) {
        const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
        if (user?.role !== "admin" && user?.role !== "superadmin") throw new Error("Forbidden");
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

export async function forwardProjectToFeed(
    projectId: string,
    data: { content: string; images?: string[]; videos?: string[]; tags?: string[] }
) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const project = await db.project.findUnique({
        where: { id: projectId, deleted: false },
        select: { userId: true, title: true },
    });
    if (!project) throw new Error("Protocol not found");

    if (project.userId !== session.user.id) {
        const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
        if (user?.role !== "admin" && user?.role !== "superadmin") throw new Error("Forbidden");
    }

    return db.post.create({
        data: {
            content: data.content,
            images: data.images || [],
            videos: data.videos || [],
            tags: data.tags || [],
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

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "superadmin") throw new Error("Forbidden: Only super admins can assign reviewers");

    const [admin, project] = await Promise.all([
        db.user.findUnique({
            where: { id: adminId },
            select: { id: true, name: true, email: true, role: true },
        }),
        db.project.findUnique({
            where: { id: projectId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                reviewAssignments: { select: { reviewerId: true } },
            },
        }),
    ]);

    if (!admin || (admin.role !== "admin" && admin.role !== "superadmin")) {
        throw new Error("Selected user is not an admin");
    }
    if (!project) throw new Error("Protocol not found");

    const alreadyAssigned = project.reviewAssignments.some((a) => a.reviewerId === adminId);
    if (alreadyAssigned) throw new Error("This reviewer is already assigned to this protocol");

    const updatedProject = await db.$transaction(async (tx) => {
        await tx.reviewAssignment.create({
            data: { projectId, reviewerId: adminId, status: "PENDING_COI" },
        });

        return tx.project.update({
            where: { id: projectId },
            data: {
                assignedToId: adminId,
                status: "PENDING_REVIEW",
                statusHistory: {
                    create: { status: "PENDING_REVIEW", changedBy: session.user.id, comment: "Protocol assigned for review" },
                },
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
    });

    await notifyAssignmentEvent({
        type: "REVIEW_ASSIGNED",
        userId: adminId,
        userEmail: admin.email,
        userName: admin.name,
        message: `You have been assigned to review the protocol: "${updatedProject.title}"`,
        projectId,
    });

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

export async function autoAssignProjectReviewer(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "superadmin") throw new Error("Forbidden: Only super admins can auto-assign reviewers");

    try {
        const project = await db.project.findUnique({
            where: { id: projectId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                reviewAssignments: { select: { reviewerId: true, status: true } },
            },
        });
        if (!project) throw new Error("Protocol not found");

        const hasActiveAssignment = project.reviewAssignments.some(
            (a) => a.status === "PENDING_COI" || a.status === "ACTIVE"
        );
        if (hasActiveAssignment) throw new Error("This protocol already has an active reviewer assignment");

        const availableAdmin = await findAvailableAdmin();
        if (!availableAdmin) throw new Error("No available admin found. All admins currently have ongoing review assignments.");

        const updatedProject = await db.$transaction(async (tx) => {
            await tx.reviewAssignment.create({
                data: { projectId, reviewerId: availableAdmin.id, status: "PENDING_COI" },
            });

            return tx.project.update({
                where: { id: projectId },
                data: {
                    assignedToId: availableAdmin.id,
                    status: "PENDING_REVIEW",
                    statusHistory: {
                        create: {
                            status: "PENDING_REVIEW",
                            changedBy: session.user.id,
                            comment: "Protocol auto-assigned for review",
                        },
                    },
                },
                include: { user: { select: { id: true, name: true, email: true } } },
            });
        });

        await notifyAssignmentEvent({
            type: "REVIEW_ASSIGNED",
            userId: availableAdmin.id,
            userEmail: availableAdmin.email,
            userName: availableAdmin.name,
            message: `You have been automatically assigned to review the protocol: "${updatedProject.title}"`,
            projectId,
        });

        await db.auditLog.create({
            data: {
                action: "AUTO_ASSIGN_REVIEWER",
                details: `Auto-assigned ${availableAdmin.name || availableAdmin.email} to review protocol "${updatedProject.title}"`,
                targetId: projectId,
                userId: session.user.id,
            },
        });

        return updatedProject;
    } catch (error) {
        console.error("[autoAssignProjectReviewer] ERROR:", error);
        throw error;
    }
}

export async function reassignProjectReviewer(projectId: string, reason?: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "superadmin") throw new Error("Forbidden: Only super admins can reassign reviewers");

    const project = await db.project.findUnique({
        where: { id: projectId },
        include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!project) throw new Error("Protocol not found");

    const currentAssignment = await db.reviewAssignment.findFirst({
        where: { projectId, status: { in: ["PENDING_COI", "ACTIVE"] } },
        include: { reviewer: { select: { id: true, name: true, email: true } } },
    });
    if (!currentAssignment) throw new Error("No active assignment found to reassign");

    const nextAdmin = await findAvailableAdmin([currentAssignment.reviewerId]);
    if (!nextAdmin) {
        throw new Error(
            "No available admin found for reassignment. All other admins currently have ongoing review assignments."
        );
    }

    const updatedProject = await db.$transaction(async (tx) => {
        await tx.reviewAssignment.update({
            where: { id: currentAssignment.id },
            data: { status: "EXCLUDED", reassignedAt: new Date() },
        });

        await tx.reviewAssignment.create({
            data: {
                projectId,
                reviewerId: nextAdmin.id,
                status: "PENDING_COI",
                reassignedFromId: currentAssignment.reviewerId,
            },
        });

        return tx.project.update({
            where: { id: projectId },
            data: {
                assignedToId: nextAdmin.id,
                statusHistory: {
                    create: {
                        status: "PENDING_REVIEW",
                        changedBy: session.user.id,
                        comment: reason
                            ? `Protocol reassigned: ${reason}`
                            : "Protocol reassigned to a new reviewer",
                    },
                },
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
    });

    await notifyAssignmentEvent({
        type: "REVIEW_REASSIGNED",
        userId: currentAssignment.reviewer.id,
        userEmail: currentAssignment.reviewer.email,
        userName: currentAssignment.reviewer.name,
        message: `You have been unassigned from the protocol: "${project.title}"${reason ? `. Reason: ${reason}` : ""}`,
        projectId,
    });

    await notifyAssignmentEvent({
        type: "REVIEW_REASSIGNED",
        userId: nextAdmin.id,
        userEmail: nextAdmin.email,
        userName: nextAdmin.name,
        message: `You have been assigned to review the protocol: "${project.title}" (reassignment)`,
        projectId,
    });

    await db.auditLog.create({
        data: {
            action: "REASSIGN_REVIEWER",
            details: `Reassigned protocol "${project.title}" from ${currentAssignment.reviewer.name || currentAssignment.reviewer.email} to ${nextAdmin.name || nextAdmin.email}${reason ? `. Reason: ${reason}` : ""}`,
            targetId: projectId,
            userId: session.user.id,
        },
    });

    return updatedProject;
}

export async function getProjectReviewAssignments(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== "admin" && user?.role !== "superadmin") throw new Error("Forbidden");

    return db.reviewAssignment.findMany({
        where: { projectId },
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
    const code = trackingCode.trim().toUpperCase();
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
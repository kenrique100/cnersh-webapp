"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";

export async function submitCOIDeclaration(data: {
    assignmentId: string;
    hasCOI: boolean;
    details?: string;
}) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    // Find the assignment and verify this user is the reviewer
    const assignment = await db.reviewAssignment.findUnique({
        where: { id: data.assignmentId },
        include: {
            project: { select: { id: true, title: true, userId: true } },
            coiDeclaration: true,
        },
    });

    if (!assignment) throw new Error("Review assignment not found");

    if (assignment.reviewerId !== session.user.id) {
        throw new Error("Forbidden: You can only submit your own COI declaration");
    }

    // COI declarations are immutable — no edit or delete after submission
    if (assignment.coiDeclaration) {
        throw new Error("COI declaration has already been submitted and cannot be changed");
    }

    // Create the COI declaration
    const declaration = await db.cOIDeclaration.create({
        data: {
            assignmentId: data.assignmentId,
            userId: session.user.id,
            hasCOI: data.hasCOI,
            details: data.details || null,
        },
    });

    // Update assignment status based on COI result
    if (data.hasCOI) {
        await db.reviewAssignment.update({
            where: { id: data.assignmentId },
            data: { status: "EXCLUDED" },
        });

        // Notify secretariat to find a replacement
        await notifyAdmins({
            type: "SYSTEM",
            message: `Reviewer declared a conflict of interest for protocol "${assignment.project.title}". A replacement reviewer is needed.`,
            link: `/admin/protocol-review`,
            excludeUserId: session.user.id,
        });

        await db.auditLog.create({
            data: {
                action: "COI_DECLARED",
                details: `Reviewer declared COI for protocol "${assignment.project.title}". Assignment excluded.`,
                targetId: assignment.project.id,
                userId: session.user.id,
            },
        });
    } else {
        // No COI — reviewer can now access protocol documents
        await db.reviewAssignment.update({
            where: { id: data.assignmentId },
            data: { status: "ACTIVE" },
        });

        await db.auditLog.create({
            data: {
                action: "COI_CLEARED",
                details: `Reviewer declared no conflict of interest for protocol "${assignment.project.title}". Access granted.`,
                targetId: assignment.project.id,
                userId: session.user.id,
            },
        });
    }

    return {
        id: declaration.id,
        hasCOI: declaration.hasCOI,
        declaredAt: declaration.declaredAt.toISOString(),
    };
}

export async function getMyReviewAssignments() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    return db.reviewAssignment.findMany({
        where: { reviewerId: session.user.id },
        include: {
            project: {
                select: {
                    id: true,
                    title: true,
                    category: true,
                    status: true,
                    trackingCode: true,
                    createdAt: true,
                },
            },
            coiDeclaration: true,
            evaluationReport: { select: { id: true, status: true, recommendation: true, submittedAt: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}

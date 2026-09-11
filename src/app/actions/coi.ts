"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { z } from "zod";

const coiSchema = z.object({
  assignmentId: z.string().trim().min(1, "Assignment identifier is required").max(128),
  hasCOI: z.boolean(),
  details: z.string().trim().max(5_000).optional(),
}).strict().superRefine((value, context) => {
  if (value.hasCOI && !value.details) {
    context.addIssue({
      code: "custom",
      path: ["details"],
      message: "Conflict details are required when declaring a conflict of interest",
    });
  }
});

export async function submitCOIDeclaration(data: {
  assignmentId: string;
  hasCOI: boolean;
  details?: string;
}) {
  const session = await authSession();
  if (!session) throw new Error("Unauthorized");

  const parsed = coiSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid COI declaration");
  const input = parsed.data;

  const result = await db.$transaction(async (tx) => {
    const assignment = await tx.reviewAssignment.findUnique({
      where: { id: input.assignmentId },
      include: {
        project: { select: { id: true, title: true, userId: true, deleted: true, status: true } },
        coiDeclaration: true,
      },
    });

    if (!assignment || assignment.project.deleted) throw new Error("Review assignment not found");
    if (assignment.reviewerId !== session.user.id) {
      throw new Error("Forbidden: You can only submit your own COI declaration");
    }

    if (assignment.coiDeclaration) {
      if (
        assignment.coiDeclaration.hasCOI === input.hasCOI
        && (assignment.coiDeclaration.details || null) === (input.details || null)
      ) {
        return {
          declaration: assignment.coiDeclaration,
          project: assignment.project,
          created: false,
        };
      }
      throw new Error("COI declaration has already been submitted and cannot be changed");
    }
    if (assignment.status !== "PENDING_COI") {
      throw new Error(`COI declarations cannot be submitted for ${assignment.status} assignments`);
    }
    if (!["PENDING_REVIEW", "UNDER_REVIEW"].includes(assignment.project.status)) {
      throw new Error("This protocol is not accepting reviewer declarations");
    }

    const declaration = await tx.cOIDeclaration.create({
      data: {
        assignmentId: input.assignmentId,
        userId: session.user.id,
        hasCOI: input.hasCOI,
        details: input.details || null,
      },
    });
    const updated = await tx.reviewAssignment.updateMany({
      where: {
        id: input.assignmentId,
        reviewerId: session.user.id,
        status: "PENDING_COI",
        project: {
          deleted: false,
          status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
        },
      },
      data: { status: input.hasCOI ? "EXCLUDED" : "ACTIVE" },
    });
    if (updated.count !== 1) throw new Error("Review assignment changed concurrently; please retry");

    if (input.hasCOI) {
      await tx.project.updateMany({
        where: {
          id: assignment.project.id,
          deleted: false,
          assignedToId: session.user.id,
        },
        data: { assignedToId: null },
      });
    } else {
      const projectTransition = await tx.project.updateMany({
        where: {
          id: assignment.project.id,
          deleted: false,
          status: "PENDING_REVIEW",
        },
        data: { status: "UNDER_REVIEW" },
      });
      if (projectTransition.count === 1) {
        await tx.projectStatusHistory.create({
          data: {
            projectId: assignment.project.id,
            status: "UNDER_REVIEW",
            changedBy: session.user.id,
            comment: "Reviewer cleared conflict-of-interest screening and began review",
          },
        });
      }
    }

    await tx.auditLog.create({
      data: input.hasCOI
        ? {
            action: "COI_DECLARED",
            details: `Reviewer declared COI for protocol "${assignment.project.title}". Assignment excluded.`,
            targetId: assignment.project.id,
            userId: session.user.id,
          }
        : {
            action: "COI_CLEARED",
            details: `Reviewer declared no conflict of interest for protocol "${assignment.project.title}". Access granted.`,
            targetId: assignment.project.id,
            userId: session.user.id,
          },
    });

    return { declaration, project: assignment.project, created: true };
  });

  if (input.hasCOI && result.created) {
    await notifyAdmins({
      type: "SYSTEM",
      message: `Reviewer declared a conflict of interest for protocol "${result.project.title}". A replacement reviewer is needed.`,
      link: "/admin/protocol-review",
      excludeUserId: session.user.id,
    }).catch((error) => console.error("Error notifying admins about COI:", error));
  }

  return {
    id: result.declaration.id,
    hasCOI: result.declaration.hasCOI,
    declaredAt: result.declaration.declaredAt.toISOString(),
  };
}

export async function getMyReviewAssignments() {
  const session = await authSession();
  if (!session) throw new Error("Unauthorized");

  return db.reviewAssignment.findMany({
    where: { reviewerId: session.user.id, project: { deleted: false } },
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
      evaluationReport: {
        select: { id: true, status: true, recommendation: true, submittedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

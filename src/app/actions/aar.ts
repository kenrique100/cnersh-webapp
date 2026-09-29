"use server";

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AARStatus } from "@/generated/prisma";
import { getCurrentReviewer } from "@/lib/reviewer-assignment";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { z } from "zod";

const AAR_WORKING_DAYS = {
  drosReview: 21,
  clarificationResponse: 30,
} as const;
const idSchema = z.string().trim().min(1, "Protocol identifier is required").max(128);
const aarStatusSchema = z.enum(AARStatus);
const statusDataSchema = z
    .object({
      aarRefNumber: z.string().trim().max(200).optional(),
      notes: z.string().trim().max(20_000).optional(),
    })
    .strict();

const statusTransitions: Partial<Record<AARStatus, readonly AARStatus[]>> = {
  RECEIVED_BY_DROS: ["CLARIFICATION_REQUESTED", "AUTHORIZED", "INADMISSIBLE"],
  CLARIFICATION_REQUESTED: ["AUTHORIZED", "INADMISSIBLE"],
};

const AAR_MESSAGES = {
  submitted: (title: string) => `AAR application submitted for protocol "${title}"`,
  receivedByDros: (title: string, due: Date) =>
      `Your AAR application for "${title}" has been received by DROS. Review deadline: ${due.toLocaleDateString()}`,
  status: {
    AUTHORIZED: (title: string) =>
        `Your AAR application for "${title}" has been authorized by the Minister.`,
    CLARIFICATION_REQUESTED: (title: string) =>
        `DROS has requested clarification for your AAR application for "${title}". You have ${AAR_WORKING_DAYS.clarificationResponse} working days to respond.`,
    INADMISSIBLE: (title: string) =>
        `Your AAR application for "${title}" has been declared inadmissible. Please start a new application.`,
  } as Partial<Record<AARStatus, (title: string) => string>>,
};

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new Error(result.error.issues[0]?.message || "Invalid AAR data");
  return result.data;
}

function safeTitle(title: string | null | undefined): string {
  return title ?? "Untitled Protocol";
}

function addWorkingDays(startDate: Date, days: number): Date {
  let count = 0;
  const date = new Date(startDate);
  while (count < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
  }
  return date;
}

/** True when the caller is the protocol's current reviewer or a superadmin. */
async function assertReviewerOrSuperadmin(projectId: string, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === "superadmin") return;
  const current = await getCurrentReviewer(projectId);
  if (current?.reviewerId !== userId) {
    throw new Error(
        "Forbidden: Only the protocol's reviewer or a superadmin may access this"
    );
  }
}

/** Sends an in-app + email notification to the protocol's current reviewer. */
async function notifyReviewer(opts: {
  projectId: string;
  projectTitle: string;
  message: string;
}) {
  const reviewer = await getCurrentReviewer(opts.projectId);
  if (!reviewer?.reviewer) return;

  await db.notification.create({
    data: {
      type: "SYSTEM",
      message: opts.message,
      link: `/protocols/${opts.projectId}`,
      userId: reviewer.reviewer.id,
    },
  });

  if (reviewer.reviewer.email) {
    sendNotificationEmail({
      to: reviewer.reviewer.email,
      userName: reviewer.reviewer.name || "Reviewer",
      notificationMessage: opts.message,
      notificationType: "SYSTEM",
      actionUrl: `/protocols/${opts.projectId}`,
    }).catch((err) =>
        console.error("Error emailing AAR reviewer:", err)
    );
  }
}

export async function startAARApplication(projectId: string) {
  const session = await verifiedAuthSession();
  const validProjectId = parse(idSchema, projectId);

  return db.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: validProjectId, deleted: false },
      include: { aarApplication: true },
    });
    if (!project) throw new Error("Protocol not found");
    if (project.userId !== session.user.id) {
      throw new Error("Forbidden: Only the protocol owner can start an AAR application");
    }
    if (
        project.status !== "APPROVED" &&
        project.status !== "APPROVED_WITH_CONDITIONS"
    ) {
      throw new Error("AAR applications can only be started for approved protocols");
    }
    if (project.aarApplication) return project.aarApplication;

    return tx.aARApplication.create({
      data: {
        projectId: validProjectId,
        applicantId: session.user.id,
        status: "DRAFT",
      },
    });
  });
}

export async function submitAARApplication(projectId: string, notes?: string) {
  const session = await verifiedAuthSession();
  const validProjectId = parse(idSchema, projectId);
  const validNotes = parse(z.string().trim().max(20_000).optional(), notes);

  const result = await db.$transaction(async (tx) => {
    const application = await tx.aARApplication.findUnique({
      where: { projectId: validProjectId },
      include: {
        project: {
          select: { id: true, title: true, userId: true, status: true, deleted: true },
        },
      },
    });
    if (!application || application.project.deleted)
      throw new Error("AAR application not found");
    if (
        application.project.userId !== session.user.id ||
        application.applicantId !== session.user.id
    ) {
      throw new Error("Forbidden: Only the applicant can submit this AAR application");
    }
    if (
        application.project.status !== "APPROVED" &&
        application.project.status !== "APPROVED_WITH_CONDITIONS"
    ) {
      throw new Error("AAR applications can only be submitted for approved protocols");
    }
    if (application.status !== "DRAFT") return { success: true, created: false };

    const updated = await tx.aARApplication.updateMany({
      where: {
        projectId: validProjectId,
        applicantId: session.user.id,
        status: "DRAFT",
        project: {
          deleted: false,
          status: { in: ["APPROVED", "APPROVED_WITH_CONDITIONS"] },
        },
      },
      data: { status: "SUBMITTED", submittedAt: new Date(), notes: validNotes || null },
    });
    if (updated.count !== 1)
      throw new Error("AAR application changed concurrently; please retry");
    await tx.auditLog.create({
      data: {
        action: "AAR_SUBMITTED",
        details: AAR_MESSAGES.submitted(safeTitle(application.project.title)),
        targetId: validProjectId,
        userId: session.user.id,
      },
    });
    return {
      success: true,
      created: true,
      projectTitle: safeTitle(application.project.title),
    };
  });

  if (result.created) {
    await notifyReviewer({
      projectId: validProjectId,
      projectTitle: result.projectTitle ?? "Untitled Protocol",
      message: `AAR application submitted for protocol "${result.projectTitle}".`,
    }).catch((err) => console.error("Error notifying AAR reviewer:", err));
  }

  return { success: true };
}

export async function confirmAARReceipt(projectId: string) {
  const session = await verifiedAuthSession();
  const validProjectId = parse(idSchema, projectId);
  await assertReviewerOrSuperadmin(validProjectId, session.user.id);

  return db.$transaction(async (tx) => {
    const application = await tx.aARApplication.findUnique({
      where: { projectId: validProjectId },
      include: {
        project: { select: { id: true, title: true, userId: true, deleted: true } },
      },
    });
    if (!application || application.project.deleted)
      throw new Error("AAR application not found");
    if (application.status !== "SUBMITTED") {
      if (application.drosDueDate) {
        return { success: true, drosDueDate: application.drosDueDate.toISOString() };
      }
      throw new Error("This application has not been submitted yet");
    }

    const now = new Date();
    const drosDueDate = addWorkingDays(now, AAR_WORKING_DAYS.drosReview);
    const updated = await tx.aARApplication.updateMany({
      where: { projectId: validProjectId, status: "SUBMITTED" },
      data: { status: "RECEIVED_BY_DROS", drosReceivedAt: now, drosDueDate },
    });
    if (updated.count !== 1)
      throw new Error("AAR application changed concurrently; please retry");

    await tx.notification.create({
      data: {
        type: "PROJECT_STATUS",
        message: AAR_MESSAGES.receivedByDros(
            safeTitle(application.project.title),
            drosDueDate
        ),
        link: `/protocols/${validProjectId}`,
        userId: application.project.userId,
      },
    });
    await tx.auditLog.create({
      data: {
        action: "AAR_RECEIVED_BY_DROS",
        details: `DROS confirmed receipt of AAR application for "${safeTitle(application.project.title)}". Due date: ${drosDueDate.toISOString()}`,
        targetId: validProjectId,
        userId: session.user.id,
      },
    });
    return { success: true, drosDueDate: drosDueDate.toISOString() };
  });
}

export async function updateAARStatus(
    projectId: string,
    status: AARStatus,
    data?: { aarRefNumber?: string; notes?: string }
) {
  const session = await verifiedAuthSession();
  const validProjectId = parse(idSchema, projectId);
  const validStatus = parse(aarStatusSchema, status);
  const input = parse(statusDataSchema, data || {});
  await assertReviewerOrSuperadmin(validProjectId, session.user.id);

  return db.$transaction(async (tx) => {
    const application = await tx.aARApplication.findUnique({
      where: { projectId: validProjectId },
      include: {
        project: { select: { id: true, title: true, userId: true, deleted: true } },
      },
    });
    if (!application || application.project.deleted)
      throw new Error("AAR application not found");
    if (application.status === validStatus) return { success: true };
    if (!(statusTransitions[application.status] || []).includes(validStatus)) {
      throw new Error(
          `Illegal AAR status transition: ${application.status} to ${validStatus}`
      );
    }
    if (validStatus === "AUTHORIZED" && !input.aarRefNumber) {
      throw new Error("An AAR reference number is required for authorization");
    }
    if (
        (validStatus === "CLARIFICATION_REQUESTED" || validStatus === "INADMISSIBLE") &&
        !input.notes
    ) {
      throw new Error(`Notes are required when setting AAR status to ${validStatus}`);
    }

    const updated = await tx.aARApplication.updateMany({
      where: { projectId: validProjectId, status: application.status },
      data: {
        status: validStatus,
        ...(input.aarRefNumber !== undefined
            ? { aarRefNumber: input.aarRefNumber || null }
            : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      },
    });
    if (updated.count !== 1)
      throw new Error("AAR application changed concurrently; please retry");

    const messageFactory = AAR_MESSAGES.status[validStatus];
    if (messageFactory) {
      await tx.notification.create({
        data: {
          type: "PROJECT_STATUS",
          message: messageFactory(safeTitle(application.project.title)),
          link: `/protocols/${validProjectId}`,
          userId: application.project.userId,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        action: `AAR_STATUS_${validStatus}`,
        details: `AAR application status updated from ${application.status} to ${validStatus} for "${safeTitle(application.project.title)}"`,
        targetId: validProjectId,
        userId: session.user.id,
      },
    });
    return { success: true };
  });
}

export async function getAARApplication(projectId: string) {
  const session = await verifiedAuthSession();
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
  const isSuperAdmin = user?.role === "superadmin";

  if (!isOwner && !isSuperAdmin) {
    await assertReviewerOrSuperadmin(validProjectId, session.user.id);
  }

  return db.aARApplication.findUnique({
    where: { projectId: validProjectId },
    include: { applicant: { select: { id: true, name: true, email: true } } },
  });
}
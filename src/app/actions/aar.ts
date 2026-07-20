"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AARStatus } from "@/generated/prisma";

const AAR_WORKING_DAYS = {
  drosReview: 21,
  clarificationResponse: 30,
} as const;

const AAR_MESSAGES = {
  submitted: (title: string) => `AAR application submitted for protocol "${title}"`,
  receivedByDros: (title: string, due: Date) => `Your AAR application for "${title}" has been received by DROS. Review deadline: ${due.toLocaleDateString()}`,
  status: {
    AUTHORIZED: (title: string) => `Your AAR application for "${title}" has been authorized by the Minister.`,
    CLARIFICATION_REQUESTED: (title: string) => `DROS has requested clarification for your AAR application for "${title}". You have ${AAR_WORKING_DAYS.clarificationResponse} working days to respond.`,
    INADMISSIBLE: (title: string) => `Your AAR application for "${title}" has been declared inadmissible. Please start a new application.`,
  } as Partial<Record<AARStatus, (title: string) => string>>,
};

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

async function requireSessionAndRole(allowedRoles: string[]) {
  const session = await authSession();
  if (!session) throw new Error("Unauthorized");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  // Fix: `user.role` may be null, but allowedRoles.includes expects a string.
  // Use non-null assertion (!) because role should always exist for a valid user.
  if (!user || !allowedRoles.includes(user.role!)) throw new Error("Forbidden");
  return session;
}

async function ensureProjectAccess(projectId: string, userId: string, allowedRoles: string[]) {
  const project = await db.project.findUnique({ where: { id: projectId, deleted: false }, include: { aarApplication: true } });
  if (!project) throw new Error("Protocol not found");
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isOwner = project.userId === userId;
  const isAdmin = !!user && allowedRoles.includes(user.role!); // apply same fix
  if (!isOwner && !isAdmin) throw new Error("Forbidden");
  return project;
}

export async function startAARApplication(projectId: string) {
  const session = await authSession();
  if (!session) throw new Error("Unauthorized");
  const project = await ensureProjectAccess(projectId, session.user.id, ["admin", "superadmin"]);
  if (project.status !== "APPROVED" && project.status !== "APPROVED_WITH_CONDITIONS") throw new Error("AAR applications can only be started for approved protocols");
  if (project.aarApplication) return project.aarApplication;
  return db.aARApplication.create({ data: { projectId, applicantId: session.user.id, status: "DRAFT" } });
}

export async function submitAARApplication(projectId: string, notes?: string) {
  const session = await authSession();
  if (!session) throw new Error("Unauthorized");
  const application = await db.aARApplication.findUnique({ where: { projectId }, include: { project: { select: { id: true, title: true, userId: true, status: true } } } });
  if (!application) throw new Error("AAR application not found");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  const isOwner = application.project.userId === session.user.id;
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  if (!isOwner && !isAdmin) throw new Error("Forbidden");
  if (application.project.status !== "APPROVED" && application.project.status !== "APPROVED_WITH_CONDITIONS") throw new Error("AAR applications can only be submitted for approved protocols");
  if (application.status !== "DRAFT") throw new Error("This AAR application has already been submitted");
  const now = new Date();
  await db.aARApplication.update({ where: { projectId }, data: { status: "SUBMITTED", submittedAt: now, notes: notes || null } });
  await db.auditLog.create({ data: { action: "AAR_SUBMITTED", details: AAR_MESSAGES.submitted(safeTitle(application.project.title)), targetId: projectId, userId: session.user.id } });
  return { success: true };
}

export async function confirmAARReceipt(projectId: string) {
  const session = await requireSessionAndRole(["admin", "superadmin"]);
  const application = await db.aARApplication.findUnique({ where: { projectId }, include: { project: { select: { id: true, title: true, userId: true } } } });
  if (!application) throw new Error("AAR application not found");
  if (application.status !== "SUBMITTED") throw new Error("This application has not been submitted yet");
  const now = new Date();
  const drosDueDate = addWorkingDays(now, AAR_WORKING_DAYS.drosReview);
  await db.aARApplication.update({ where: { projectId }, data: { status: "RECEIVED_BY_DROS", drosReceivedAt: now, drosDueDate } });
  await db.notification.create({ data: { type: "PROJECT_STATUS", message: AAR_MESSAGES.receivedByDros(safeTitle(application.project.title), drosDueDate), link: `/protocols/${projectId}`, userId: application.project.userId } });
  await db.auditLog.create({ data: { action: "AAR_RECEIVED_BY_DROS", details: `DROS confirmed receipt of AAR application for "${safeTitle(application.project.title)}". Due date: ${drosDueDate.toISOString()}`, targetId: projectId, userId: session.user.id } });
  return { success: true, drosDueDate: drosDueDate.toISOString() };
}

export async function updateAARStatus(projectId: string, status: AARStatus, data?: { aarRefNumber?: string; notes?: string }) {
  const session = await requireSessionAndRole(["admin", "superadmin"]);
  const application = await db.aARApplication.findUnique({ where: { projectId }, include: { project: { select: { id: true, title: true, userId: true } } } });
  if (!application) throw new Error("AAR application not found");
  if (application.status === "INADMISSIBLE") throw new Error("This AAR application is inadmissible and cannot be updated");
  await db.aARApplication.update({ where: { projectId }, data: { status, ...(data?.aarRefNumber ? { aarRefNumber: data.aarRefNumber } : {}), ...(data?.notes ? { notes: data.notes } : {}) } });
  const messageFactory = AAR_MESSAGES.status[status];
  if (messageFactory) await db.notification.create({ data: { type: "PROJECT_STATUS", message: messageFactory(safeTitle(application.project.title)), link: `/protocols/${projectId}`, userId: application.project.userId } });
  await db.auditLog.create({ data: { action: `AAR_STATUS_${status}`, details: `AAR application status updated to ${status} for "${safeTitle(application.project.title)}"`, targetId: projectId, userId: session.user.id } });
  return { success: true };
}

export async function getAARApplication(projectId: string) {
  const session = await authSession();
  if (!session) throw new Error("Unauthorized");
  const project = await db.project.findUnique({ where: { id: projectId, deleted: false }, select: { userId: true } });
  if (!project) throw new Error("Protocol not found");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  const isOwner = project.userId === session.user.id;
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  if (!isOwner && !isAdmin) throw new Error("Forbidden");
  return db.aARApplication.findUnique({ where: { projectId }, include: { applicant: { select: { id: true, name: true, email: true } } } });
}
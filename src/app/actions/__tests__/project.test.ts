/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/notify-admins", () => ({ notifyAdmins: jest.fn() }));
jest.mock("@/lib/send-notification-email", () => ({ sendNotificationEmail: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    user: {},
    project: {},
    reviewAssignment: {},
  },
}));

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import {
  assignProjectReviewer,
  deleteProject,
  getProjectById,
  getProjectReviewAssignments,
  reassignProjectReviewer,
  submitProject,
  updateProject,
  updateProjectStatus,
} from "@/app/actions/project";

const authMock = authSession as jest.Mock;
const notifyMock = notifyAdmins as jest.Mock;
const emailMock = sendNotificationEmail as jest.Mock;
const mockDb = db as unknown as Record<string, any>;

function login(id = "owner-1", role = "user") {
  authMock.mockResolvedValue({ user: { id, name: "User", role } });
  mockDb.user.findUnique.mockResolvedValue({ role });
}

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "project-1",
    trackingCode: "CNERSH-2026-ABCD",
    title: "Protocol",
    description: "Description",
    category: "Health",
    userId: "owner-1",
    status: "SUBMITTED",
    deleted: false,
    feedback: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: "owner-1", name: "Owner", email: "owner@test.com" },
    reviewAssignments: [],
    statusHistory: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(mockDb));
  mockDb.user = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  };
  mockDb.project = {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  mockDb.reviewAssignment = {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  mockDb.projectStatusHistory = { create: jest.fn() };
  mockDb.notification = { create: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };
  notifyMock.mockResolvedValue(undefined);
  emailMock.mockResolvedValue(undefined);
});

test("submission validates required fields before writing", async () => {
  login();
  await expect(submitProject({
    title: " ",
    description: "Description",
    category: "Health",
  })).rejects.toThrow("Protocol title is required");
  expect(mockDb.$transaction).not.toHaveBeenCalled();
});

test("admin submissions are never auto-approved", async () => {
  login("admin-owner", "admin");
  mockDb.project.findUnique.mockResolvedValue(null);
  mockDb.reviewAssignment.findMany.mockResolvedValue([]);
  mockDb.user.findFirst.mockResolvedValue(null);
  const created = project({
    userId: "admin-owner",
    status: "SUBMITTED",
  });
  mockDb.project.create.mockResolvedValue(created);

  const result = await submitProject({
    title: "Protocol",
    description: "Description",
    category: "Health",
  });

  expect(result.status).toBe("SUBMITTED");
  expect(mockDb.project.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      status: "SUBMITTED",
      userId: "admin-owner",
    }),
  }));
  expect(mockDb.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ action: "PROJECT_SUBMITTED" }),
  }));
});

test("available reviewer assignment excludes the submitting admin and is atomic", async () => {
  login("owner-1");
  mockDb.project.findUnique.mockResolvedValue(null);
  mockDb.user.findFirst.mockResolvedValue({
    id: "admin-2",
    name: "Reviewer",
    email: "reviewer@test.com",
  });
  mockDb.project.create.mockResolvedValue(project({ status: "PENDING_REVIEW" }));

  const result = await submitProject({
    title: "Protocol",
    description: "Description",
    category: "Health",
  });
  expect(result.status).toBe("PENDING_REVIEW");
  expect(mockDb.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ id: { notIn: expect.arrayContaining(["owner-1"]) } }),
  }));
  expect(mockDb.reviewAssignment.create).toHaveBeenCalledWith({
    data: {
      projectId: "project-1",
      reviewerId: "admin-2",
      status: "PENDING_COI",
    },
  });
});

test("submission falls back to the queue when the selected reviewer becomes busy", async () => {
  login("owner-1");
  mockDb.project.findUnique.mockResolvedValue(null);
  mockDb.user.findFirst.mockResolvedValue({
    id: "admin-2",
    name: "Reviewer",
    email: "reviewer@test.com",
  });
  mockDb.reviewAssignment.findFirst.mockResolvedValue({ id: "other-active-assignment" });
  mockDb.project.create.mockResolvedValue(project({ status: "SUBMITTED" }));

  const result = await submitProject({
    title: "Protocol",
    description: "Description",
    category: "Health",
  });

  expect(result.status).toBe("SUBMITTED");
  expect(mockDb.project.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "SUBMITTED" }),
  }));
  expect(mockDb.reviewAssignment.create).not.toHaveBeenCalled();
});

test("project status changes follow the legal source-state matrix and require feedback", async () => {
  login("admin-1", "admin");
  mockDb.project.findUnique.mockResolvedValue(project({ status: "SUBMITTED" }));
  await expect(updateProjectStatus("project-1", "APPROVED"))
    .rejects.toThrow("Illegal protocol status transition");

  mockDb.project.findUnique.mockResolvedValue(project({ status: "REVIEW_COMPLETE" }));
  await expect(updateProjectStatus("project-1", "APPROVED_WITH_CONDITIONS"))
    .rejects.toThrow("Feedback is required");
});

test("legal status transition, history, notification and audit commit together", async () => {
  login("admin-1", "admin");
  const current = project({ status: "REVIEW_COMPLETE" });
  const updated = project({ status: "APPROVED" });
  mockDb.project.findUnique.mockResolvedValue(current);
  mockDb.project.findUniqueOrThrow.mockResolvedValue(updated);
  mockDb.user.findUnique
    .mockResolvedValueOnce({ role: "admin" })
    .mockResolvedValueOnce({ email: "owner@test.com", name: "Owner" });

  await expect(updateProjectStatus("project-1", "APPROVED")).resolves.toBe(updated);
  expect(mockDb.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ deleted: false, status: "REVIEW_COMPLETE" }),
    data: { status: "APPROVED", feedback: null },
  }));
  expect(mockDb.projectStatusHistory.create).toHaveBeenCalled();
  expect(mockDb.notification.create).toHaveBeenCalled();
  expect(mockDb.auditLog.create).toHaveBeenCalled();
});

test("only owners may edit or delete, and only before submission or after incomplete return", async () => {
  login();
  mockDb.project.findUnique.mockResolvedValue(project({ status: "SUBMITTED" }));
  await expect(updateProject("project-1", { title: "Changed" }))
    .rejects.toThrow("cannot be edited");
  await expect(deleteProject("project-1")).rejects.toThrow("cannot be deleted");

  mockDb.project.findUnique.mockResolvedValue(project({ status: "RETURNED_INCOMPLETE" }));
  mockDb.project.findUniqueOrThrow.mockResolvedValue(project({ title: "Changed" }));
  await expect(updateProject("project-1", { title: " Changed " }))
    .resolves.toEqual(expect.objectContaining({ title: "Changed" }));
  expect(mockDb.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ userId: "owner-1", deleted: false }),
    data: expect.objectContaining({ title: "Changed" }),
  }));
});

test("an excluded reviewer cannot regain project access through the admin role", async () => {
  login("reviewer-1", "admin");
  mockDb.project.findUnique.mockResolvedValue(project({
    userId: "owner-1",
    reviewAssignments: [{
      reviewerId: "reviewer-1",
      status: "EXCLUDED",
      reviewer: {},
      coiDeclaration: { hasCOI: true },
      evaluationReport: null,
    }],
  }));
  await expect(getProjectById("project-1")).rejects.toThrow("Excluded reviewers");
});

test("manual assignment rejects owner, busy, banned, and previously excluded reviewers", async () => {
  login("president", "superadmin");
  mockDb.user.findUnique
    .mockResolvedValueOnce({ role: "superadmin" })
    .mockResolvedValueOnce({
      id: "owner-1",
      name: "Owner",
      email: "owner@test.com",
      role: "admin",
      banned: false,
    });
  mockDb.project.findUnique.mockResolvedValue(project());
  await expect(assignProjectReviewer("project-1", "owner-1"))
    .rejects.toThrow("owners cannot review");

  mockDb.user.findUnique
    .mockResolvedValueOnce({ role: "superadmin" })
    .mockResolvedValueOnce({
      id: "admin-2",
      name: "Reviewer",
      email: "reviewer@test.com",
      role: "admin",
      banned: false,
    });
  mockDb.project.findUnique.mockResolvedValue(project({
    reviewAssignments: [{ reviewerId: "admin-2", status: "EXCLUDED" }],
  }));
  await expect(assignProjectReviewer("project-1", "admin-2"))
    .rejects.toThrow("already assigned or excluded");
});

test("reassignment excludes every prior reviewer from replacement selection", async () => {
  login("president", "superadmin");
  mockDb.project.findUnique.mockResolvedValue(project({
    status: "UNDER_REVIEW",
    reviewAssignments: [
      { reviewerId: "old-reviewer" },
      { reviewerId: "excluded-before" },
    ],
  }));
  mockDb.reviewAssignment.findFirst.mockResolvedValue({
    id: "assignment-1",
    projectId: "project-1",
    reviewerId: "old-reviewer",
    status: "ACTIVE",
    reviewer: {
      id: "old-reviewer",
      name: "Old",
      email: "old@test.com",
    },
  });
  mockDb.reviewAssignment.findMany.mockResolvedValue([]);
  mockDb.user.findFirst.mockResolvedValue(null);

  await expect(reassignProjectReviewer("project-1")).rejects.toThrow("No available admin");
  expect(mockDb.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      id: {
        notIn: expect.arrayContaining(["owner-1", "old-reviewer", "excluded-before"]),
      },
    }),
  }));
});

test("excluded regular admin cannot list project review assignments", async () => {
  login("reviewer-1", "admin");
  mockDb.project.findUnique.mockResolvedValue({ id: "project-1" });
  mockDb.reviewAssignment.findFirst.mockResolvedValue({ id: "excluded-assignment" });
  await expect(getProjectReviewAssignments("project-1"))
    .rejects.toThrow("Excluded reviewers");
});

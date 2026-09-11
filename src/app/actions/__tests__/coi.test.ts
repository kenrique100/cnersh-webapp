/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/notify-admins", () => ({ notifyAdmins: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    reviewAssignment: {},
  },
}));

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { getMyReviewAssignments, submitCOIDeclaration } from "@/app/actions/coi";

const authMock = authSession as jest.Mock;
const notifyMock = notifyAdmins as jest.Mock;
const mockDb = db as unknown as Record<string, any>;

function login(id = "reviewer-1") {
  authMock.mockResolvedValue({ user: { id, name: "Reviewer" } });
}

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: "assignment-1",
    reviewerId: "reviewer-1",
    status: "PENDING_COI",
    coiDeclaration: null,
    project: {
      id: "project-1",
      title: "Protocol",
      userId: "owner-1",
      deleted: false,
      status: "PENDING_REVIEW",
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reviewAssignment = { findMany: jest.fn() };
  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(mockDb));
  mockDb.cOIDeclaration = { create: jest.fn() };
  mockDb.project = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
  mockDb.projectStatusHistory = { create: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };
  notifyMock.mockResolvedValue(undefined);
});

test("requires authentication and strict conflict details", async () => {
  authMock.mockResolvedValue(null);
  await expect(submitCOIDeclaration({
    assignmentId: "assignment-1",
    hasCOI: false,
  })).rejects.toThrow("Unauthorized");

  login();
  await expect(submitCOIDeclaration({
    assignmentId: "assignment-1",
    hasCOI: true,
  })).rejects.toThrow("Conflict details are required");
});

test("atomically clears COI and starts project review", async () => {
  login();
  const declaredAt = new Date("2026-09-01T12:00:00Z");
  mockDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(assignment());
  mockDb.reviewAssignment.updateMany = jest.fn().mockResolvedValue({ count: 1 });
  mockDb.cOIDeclaration.create.mockResolvedValue({
    id: "coi-1",
    hasCOI: false,
    declaredAt,
  });

  await expect(submitCOIDeclaration({
    assignmentId: "assignment-1",
    hasCOI: false,
  })).resolves.toEqual({
    id: "coi-1",
    hasCOI: false,
    declaredAt: declaredAt.toISOString(),
  });

  expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
  expect(mockDb.reviewAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ status: "PENDING_COI", reviewerId: "reviewer-1" }),
    data: { status: "ACTIVE" },
  }));
  expect(mockDb.projectStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "UNDER_REVIEW" }),
  }));
  expect(mockDb.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ action: "COI_CLEARED" }),
  }));
});

test("conflicted reviewer is excluded, detached, and admins are notified after commit", async () => {
  login();
  const declaredAt = new Date();
  mockDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(assignment());
  mockDb.reviewAssignment.updateMany = jest.fn().mockResolvedValue({ count: 1 });
  mockDb.cOIDeclaration.create.mockResolvedValue({
    id: "coi-2",
    hasCOI: true,
    declaredAt,
  });

  await submitCOIDeclaration({
    assignmentId: "assignment-1",
    hasCOI: true,
    details: "Close collaborator",
  });

  expect(mockDb.reviewAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: { status: "EXCLUDED" },
  }));
  expect(mockDb.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: { assignedToId: null },
  }));
  expect(notifyMock).toHaveBeenCalledTimes(1);
});

test("same declaration retry is idempotent", async () => {
  login();
  const existing = { id: "coi-1", hasCOI: false, declaredAt: new Date() };
  mockDb.reviewAssignment.findUnique = jest.fn().mockResolvedValue(assignment({
    status: "ACTIVE",
    coiDeclaration: existing,
  }));

  const result = await submitCOIDeclaration({
    assignmentId: "assignment-1",
    hasCOI: false,
  });
  expect(result.id).toBe("coi-1");
  expect(mockDb.cOIDeclaration.create).not.toHaveBeenCalled();
  expect(mockDb.auditLog.create).not.toHaveBeenCalled();
});

test("assignment listing excludes deleted projects", async () => {
  login();
  mockDb.reviewAssignment.findMany.mockResolvedValue([]);
  await getMyReviewAssignments();
  expect(mockDb.reviewAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { reviewerId: "reviewer-1", project: { deleted: false } },
  }));
});

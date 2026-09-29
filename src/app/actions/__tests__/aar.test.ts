/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ verifiedAuthSession: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    user: {},
    project: {},
    aARApplication: {},
    notification: {},
  },
}));
jest.mock("@/lib/reviewer-assignment", () => ({
  getCurrentReviewer: jest.fn(),
}));
jest.mock("@/lib/send-notification-email", () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getCurrentReviewer } from "@/lib/reviewer-assignment";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import {
  confirmAARReceipt,
  getAARApplication,
  startAARApplication,
  submitAARApplication,
  updateAARStatus,
} from "@/app/actions/aar";

const authMock = verifiedAuthSession as jest.Mock;
const getReviewerMock = getCurrentReviewer as jest.Mock;
const emailMock = sendNotificationEmail as jest.Mock;
const mockDb = db as unknown as Record<string, any>;

function login(id = "owner-1", role = "user") {
  authMock.mockResolvedValue({ user: { id } });
  mockDb.user.findUnique.mockResolvedValue({ role });
}

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "project-1",
    userId: "owner-1",
    title: "Protocol",
    status: "APPROVED",
    deleted: false,
    aarApplication: null,
    ...overrides,
  };
}

function application(overrides: Record<string, unknown> = {}) {
  return {
    id: "aar-1",
    projectId: "project-1",
    applicantId: "owner-1",
    status: "DRAFT",
    drosDueDate: null,
    project: project(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
      callback(mockDb)
  );

  mockDb.user = { findUnique: jest.fn() };
  mockDb.project = { findUnique: jest.fn() };
  mockDb.aARApplication = {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  mockDb.notification = { create: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };

  getReviewerMock.mockResolvedValue(null);
  emailMock.mockResolvedValue(undefined);
});

test("only an approved protocol owner can start an AAR", async () => {
  login("admin-1", "admin");
  mockDb.project.findUnique.mockResolvedValue(project());
  await expect(startAARApplication("project-1")).rejects.toThrow(
      "Only the protocol owner"
  );

  login();
  mockDb.project.findUnique.mockResolvedValue(
      project({ status: "UNDER_APPEAL" })
  );
  await expect(startAARApplication("project-1")).rejects.toThrow(
      "approved protocols"
  );
});

test("AAR start is transactionally idempotent", async () => {
  login();
  const existing = { id: "aar-1", status: "DRAFT" };
  mockDb.project.findUnique.mockResolvedValue(
      project({ aarApplication: existing })
  );
  await expect(startAARApplication("project-1")).resolves.toBe(existing);
  expect(mockDb.aARApplication.create).not.toHaveBeenCalled();
});

test("applicant submission is atomic, notifies reviewer, and is repeat-safe", async () => {
  login();
  mockDb.aARApplication.findUnique.mockResolvedValue(application());
  getReviewerMock.mockResolvedValue({
    reviewerId: "reviewer-1",
    reviewer: {
      id: "reviewer-1",
      name: "Reviewer",
      email: "reviewer@example.com",
    },
  });

  await expect(submitAARApplication("project-1", " Cover note ")).resolves.toEqual(
      { success: true }
  );

  expect(mockDb.aARApplication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project-1",
          applicantId: "owner-1",
          status: "DRAFT",
          project: {
            deleted: false,
            status: { in: ["APPROVED", "APPROVED_WITH_CONDITIONS"] },
          },
        }),
        data: expect.objectContaining({
          status: "SUBMITTED",
          notes: "Cover note",
        }),
      })
  );
  expect(mockDb.auditLog.create).toHaveBeenCalled();
  expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "reviewer-1" }),
      })
  );
  expect(emailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "reviewer@example.com" })
  );

  // ---- Repeat call: status is already SUBMITTED, must be a no-op ----
  jest.clearAllMocks();
  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
      callback(mockDb)
  );
  login();
  mockDb.aARApplication.findUnique.mockResolvedValue(
      application({ status: "SUBMITTED" })
  );

  await expect(submitAARApplication("project-1")).resolves.toEqual({
    success: true,
  });
  expect(mockDb.aARApplication.updateMany).not.toHaveBeenCalled();
  expect(mockDb.notification.create).not.toHaveBeenCalled();
});

test("DROS receipt is atomic and idempotently preserves its original due date", async () => {
  login("admin-1", "admin");
  getReviewerMock.mockResolvedValue({ reviewerId: "admin-1" });
  mockDb.aARApplication.findUnique.mockResolvedValue(
      application({ status: "SUBMITTED" })
  );

  const first = await confirmAARReceipt("project-1");
  expect(first.drosDueDate).toBeTruthy();
  expect(mockDb.notification.create).toHaveBeenCalled();
  expect(mockDb.auditLog.create).toHaveBeenCalled();

  const originalDue = new Date("2026-10-10T00:00:00Z");

  jest.clearAllMocks();
  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
      callback(mockDb)
  );
  login("admin-1", "admin");
  getReviewerMock.mockResolvedValue({ reviewerId: "admin-1" });

  mockDb.aARApplication.findUnique.mockResolvedValue(
      application({
        status: "RECEIVED_BY_DROS",
        drosDueDate: originalDue,
      })
  );

  await expect(confirmAARReceipt("project-1")).resolves.toEqual({
    success: true,
    drosDueDate: originalDue.toISOString(),
  });
  expect(mockDb.notification.create).not.toHaveBeenCalled();
});

test("confirmAARReceipt rejects a non-reviewer admin", async () => {
  login("admin-1", "admin");
  getReviewerMock.mockResolvedValue({ reviewerId: "someone-else" });

  await expect(confirmAARReceipt("project-1")).rejects.toThrow(
      /reviewer|superadmin/i
  );
});

test("confirmAARReceipt allows the superadmin regardless of assignment", async () => {
  login("super-1", "superadmin");
  mockDb.aARApplication.findUnique.mockResolvedValue(
      application({
        status: "RECEIVED_BY_DROS",
        drosDueDate: new Date("2026-10-10T00:00:00Z"),
      })
  );

  await expect(confirmAARReceipt("project-1")).resolves.toEqual({
    success: true,
    drosDueDate: new Date("2026-10-10T00:00:00Z").toISOString(),
  });
});

test("AAR decision matrix and required decision details are enforced", async () => {
  login("admin-1", "admin");
  getReviewerMock.mockResolvedValue({ reviewerId: "admin-1" });

  mockDb.aARApplication.findUnique.mockResolvedValue(
      application({ status: "SUBMITTED" })
  );
  await expect(
      updateAARStatus("project-1", "AUTHORIZED", { aarRefNumber: "AAR-1" })
  ).rejects.toThrow("Illegal AAR status transition");

  mockDb.aARApplication.findUnique.mockResolvedValue(
      application({ status: "RECEIVED_BY_DROS" })
  );
  await expect(updateAARStatus("project-1", "AUTHORIZED")).rejects.toThrow(
      "reference number"
  );
  await expect(
      updateAARStatus("project-1", "CLARIFICATION_REQUESTED")
  ).rejects.toThrow("Notes are required");
});

test("updateAARStatus rejects a non-reviewer admin", async () => {
  login("admin-1", "admin");
  getReviewerMock.mockResolvedValue({ reviewerId: "someone-else" });

  await expect(
      updateAARStatus("project-1", "AUTHORIZED", { aarRefNumber: "AAR-1" })
  ).rejects.toThrow(/reviewer|superadmin/i);
});

test("legal AAR status change writes notification and audit in the transaction", async () => {
  login("admin-1", "admin");
  getReviewerMock.mockResolvedValue({ reviewerId: "admin-1" });
  mockDb.aARApplication.findUnique.mockResolvedValue(
      application({ status: "RECEIVED_BY_DROS" })
  );

  await expect(
      updateAARStatus("project-1", "AUTHORIZED", {
        aarRefNumber: " AAR-2026-1 ",
      })
  ).resolves.toEqual({ success: true });

  expect(mockDb.aARApplication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project-1", status: "RECEIVED_BY_DROS" },
        data: expect.objectContaining({
          status: "AUTHORIZED",
          aarRefNumber: "AAR-2026-1",
        }),
      })
  );
  expect(mockDb.notification.create).toHaveBeenCalled();
  expect(mockDb.auditLog.create).toHaveBeenCalled();
});

test("getAARApplication forbids a non-owner non-reviewer non-superadmin", async () => {
  login("other", "user");
  mockDb.project.findUnique.mockResolvedValue({ userId: "owner-1" });
  getReviewerMock.mockResolvedValue(null);

  await expect(getAARApplication("project-1")).rejects.toThrow("Forbidden");
});

test("getAARApplication allows the current reviewer", async () => {
  login("reviewer-1", "admin");
  mockDb.project.findUnique.mockResolvedValue({ userId: "owner-1" });
  getReviewerMock.mockResolvedValue({ reviewerId: "reviewer-1" });
  mockDb.aARApplication.findUnique.mockResolvedValue(
      application({ applicant: { id: "owner-1", name: "Owner", email: "o@x" } })
  );

  await expect(getAARApplication("project-1")).resolves.toEqual(
      expect.objectContaining({ id: "aar-1" })
  );
});
/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    user: {},
    project: {},
    aARApplication: {},
  },
}));

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import {
  confirmAARReceipt,
  getAARApplication,
  startAARApplication,
  submitAARApplication,
  updateAARStatus,
} from "@/app/actions/aar";

const authMock = authSession as jest.Mock;
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
  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(mockDb));
  mockDb.user = { findUnique: jest.fn() };
  mockDb.project = { findUnique: jest.fn() };
  mockDb.aARApplication = {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  mockDb.notification = { create: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };
});

test("only an approved protocol owner can start an AAR", async () => {
  login("admin-1", "admin");
  mockDb.project.findUnique.mockResolvedValue(project());
  await expect(startAARApplication("project-1")).rejects.toThrow("Only the protocol owner");

  login();
  mockDb.project.findUnique.mockResolvedValue(project({ status: "UNDER_APPEAL" }));
  await expect(startAARApplication("project-1")).rejects.toThrow("approved protocols");
});

test("AAR start is transactionally idempotent", async () => {
  login();
  const existing = { id: "aar-1", status: "DRAFT" };
  mockDb.project.findUnique.mockResolvedValue(project({ aarApplication: existing }));
  await expect(startAARApplication("project-1")).resolves.toBe(existing);
  expect(mockDb.aARApplication.create).not.toHaveBeenCalled();
});

test("applicant submission is atomic and repeat-safe", async () => {
  login();
  mockDb.aARApplication.findUnique.mockResolvedValue(application());
  await expect(submitAARApplication("project-1", " Cover note "))
    .resolves.toEqual({ success: true });
  expect(mockDb.aARApplication.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      projectId: "project-1",
      applicantId: "owner-1",
      status: "DRAFT",
      project: {
        deleted: false,
        status: { in: ["APPROVED", "APPROVED_WITH_CONDITIONS"] },
      },
    }),
    data: expect.objectContaining({ status: "SUBMITTED", notes: "Cover note" }),
  }));
  expect(mockDb.auditLog.create).toHaveBeenCalled();

  jest.clearAllMocks();
  mockDb.aARApplication.findUnique.mockResolvedValue(application({ status: "SUBMITTED" }));
  await expect(submitAARApplication("project-1")).resolves.toEqual({ success: true });
  expect(mockDb.aARApplication.updateMany).not.toHaveBeenCalled();
});

test("DROS receipt is atomic and idempotently preserves its original due date", async () => {
  login("admin-1", "admin");
  mockDb.aARApplication.findUnique.mockResolvedValue(application({ status: "SUBMITTED" }));
  const first = await confirmAARReceipt("project-1");
  expect(first.drosDueDate).toBeTruthy();
  expect(mockDb.notification.create).toHaveBeenCalled();
  expect(mockDb.auditLog.create).toHaveBeenCalled();

  const originalDue = new Date("2026-10-10T00:00:00Z");
  jest.clearAllMocks();
  mockDb.user.findUnique.mockResolvedValue({ role: "admin" });
  mockDb.aARApplication.findUnique.mockResolvedValue(application({
    status: "RECEIVED_BY_DROS",
    drosDueDate: originalDue,
  }));
  await expect(confirmAARReceipt("project-1")).resolves.toEqual({
    success: true,
    drosDueDate: originalDue.toISOString(),
  });
  expect(mockDb.notification.create).not.toHaveBeenCalled();
});

test("AAR decision matrix and required decision details are enforced", async () => {
  login("admin-1", "admin");
  mockDb.aARApplication.findUnique.mockResolvedValue(application({ status: "SUBMITTED" }));
  await expect(updateAARStatus("project-1", "AUTHORIZED", { aarRefNumber: "AAR-1" }))
    .rejects.toThrow("Illegal AAR status transition");

  mockDb.aARApplication.findUnique.mockResolvedValue(application({ status: "RECEIVED_BY_DROS" }));
  await expect(updateAARStatus("project-1", "AUTHORIZED"))
    .rejects.toThrow("reference number");
  await expect(updateAARStatus("project-1", "CLARIFICATION_REQUESTED"))
    .rejects.toThrow("Notes are required");
});

test("legal AAR status change writes notification and audit in the transaction", async () => {
  login("admin-1", "admin");
  mockDb.aARApplication.findUnique.mockResolvedValue(application({ status: "RECEIVED_BY_DROS" }));
  await expect(updateAARStatus("project-1", "AUTHORIZED", {
    aarRefNumber: " AAR-2026-1 ",
  })).resolves.toEqual({ success: true });
  expect(mockDb.aARApplication.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { projectId: "project-1", status: "RECEIVED_BY_DROS" },
    data: expect.objectContaining({ status: "AUTHORIZED", aarRefNumber: "AAR-2026-1" }),
  }));
  expect(mockDb.notification.create).toHaveBeenCalled();
  expect(mockDb.auditLog.create).toHaveBeenCalled();
});

test("AAR reads require a non-deleted project and owner or admin access", async () => {
  login("other", "user");
  mockDb.project.findUnique.mockResolvedValue({ userId: "owner-1" });
  await expect(getAARApplication("project-1")).rejects.toThrow("Forbidden");
});

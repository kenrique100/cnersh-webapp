/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/notify-admins", () => ({ notifyAdmins: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    user: {},
    project: {},
    appeal: {},
  },
}));

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import {
  fileAppeal,
  getPendingAppeals,
  getProjectAppeal,
  resolveAppeal,
} from "@/app/actions/appeal";

const authMock = authSession as jest.Mock;
const notifyMock = notifyAdmins as jest.Mock;
const mockDb = db as unknown as Record<string, any>;

function login(id = "owner-1") {
  authMock.mockResolvedValue({ user: { id } });
}

function rejectedProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "project-1",
    userId: "owner-1",
    title: "Protocol",
    status: "RESUBMIT",
    deleted: false,
    appeal: null,
    statusHistory: [{ createdAt: new Date(Date.now() - 86_400_000) }],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(mockDb));
  mockDb.user = { findUnique: jest.fn() };
  mockDb.project = {
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  mockDb.appeal = {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findMany: jest.fn(),
  };
  mockDb.projectStatusHistory = { create: jest.fn() };
  mockDb.notification = { create: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };
  notifyMock.mockResolvedValue(undefined);
});

test("filing validates authentication, grounds, ownership and rejection source state", async () => {
  authMock.mockResolvedValue(null);
  await expect(fileAppeal({ projectId: "project-1", grounds: "Error" }))
    .rejects.toThrow("Unauthorized");

  login();
  await expect(fileAppeal({ projectId: "project-1", grounds: " " }))
    .rejects.toThrow("Appeal grounds are required");

  mockDb.project.findUnique.mockResolvedValue(rejectedProject({ userId: "other" }));
  await expect(fileAppeal({ projectId: "project-1", grounds: "Error" }))
    .rejects.toThrow("Only the PI");
});

test("appeal creation, project transition, history and audit are one transaction", async () => {
  login();
  const appeal = {
    id: "appeal-1",
    appellantId: "owner-1",
    grounds: "Procedural error",
    evidence: null,
    filedAt: new Date(),
    deadlineAt: new Date(Date.now() + 45 * 86_400_000),
  };
  mockDb.project.findUnique.mockResolvedValue(rejectedProject());
  mockDb.appeal.create.mockResolvedValue(appeal);

  const result = await fileAppeal({
    projectId: "project-1",
    grounds: " Procedural error ",
  });

  expect(result.id).toBe("appeal-1");
  expect(mockDb.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: "project-1", deleted: false, status: "RESUBMIT" },
    data: { status: "UNDER_APPEAL" },
  }));
  expect(mockDb.projectStatusHistory.create).toHaveBeenCalled();
  expect(mockDb.auditLog.create).toHaveBeenCalled();
  expect(notifyMock).toHaveBeenCalledTimes(1);
});

test("same appeal retry is idempotent", async () => {
  login();
  const existing = {
    id: "appeal-1",
    appellantId: "owner-1",
    grounds: "Error",
    evidence: null,
    filedAt: new Date(),
    deadlineAt: new Date(),
  };
  mockDb.project.findUnique.mockResolvedValue(rejectedProject({
    status: "UNDER_APPEAL",
    appeal: existing,
  }));

  const result = await fileAppeal({ projectId: "project-1", grounds: "Error" });
  expect(result.id).toBe("appeal-1");
  expect(mockDb.appeal.create).not.toHaveBeenCalled();
  expect(notifyMock).not.toHaveBeenCalled();
});

test("expired and future rejection dates are rejected", async () => {
  login();
  mockDb.project.findUnique.mockResolvedValueOnce(rejectedProject({
    statusHistory: [{ createdAt: new Date(Date.now() - 31 * 86_400_000) }],
  }));
  await expect(fileAppeal({ projectId: "project-1", grounds: "Error" }))
    .rejects.toThrow("appeal window");

  mockDb.project.findUnique.mockResolvedValueOnce(rejectedProject({
    statusHistory: [{ createdAt: new Date(Date.now() + 86_400_000) }],
  }));
  await expect(fileAppeal({ projectId: "project-1", grounds: "Error" }))
    .rejects.toThrow("future");
});

test("president resolves only pending appeals on UNDER_APPEAL protocols", async () => {
  login("president");
  mockDb.user.findUnique.mockResolvedValue({ role: "superadmin" });
  mockDb.appeal.findUnique.mockResolvedValue({
    status: "PENDING",
    project: {
      id: "project-1",
      title: "Protocol",
      userId: "owner-1",
      status: "UNDER_APPEAL",
      deleted: false,
    },
  });

  await expect(resolveAppeal({
    projectId: "project-1",
    decision: "UPHELD",
    decisionText: "Decision corrected",
  })).resolves.toEqual({ success: true, decision: "UPHELD" });

  expect(mockDb.appeal.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      projectId: "project-1",
      status: "PENDING",
      project: { deleted: false, status: "UNDER_APPEAL" },
    }),
  }));
  expect(mockDb.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: "project-1", deleted: false, status: "UNDER_APPEAL" },
    data: { status: "APPROVED" },
  }));
  expect(mockDb.notification.create).toHaveBeenCalled();
});

test("same appeal resolution retry is idempotent", async () => {
  login("president");
  mockDb.user.findUnique.mockResolvedValue({ role: "superadmin" });
  mockDb.appeal.findUnique.mockResolvedValue({
    status: "UPHELD",
    project: { deleted: false, status: "APPROVED" },
  });
  await expect(resolveAppeal({
    projectId: "project-1",
    decision: "UPHELD",
    decisionText: "Same decision",
  })).resolves.toEqual({ success: true, decision: "UPHELD" });
  expect(mockDb.auditLog.create).not.toHaveBeenCalled();
});

test("appeal reads enforce access and pending query source state", async () => {
  login("admin");
  mockDb.project.findUnique.mockResolvedValue({ userId: "owner" });
  mockDb.user.findUnique.mockResolvedValue({ role: "admin" });
  mockDb.appeal.findUnique.mockResolvedValue(null);
  await expect(getProjectAppeal("project-1")).resolves.toBeNull();

  mockDb.user.findUnique.mockResolvedValue({ role: "superadmin" });
  mockDb.appeal.findMany.mockResolvedValue([]);
  await getPendingAppeals();
  expect(mockDb.appeal.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { status: "PENDING", project: { deleted: false, status: "UNDER_APPEAL" } },
  }));
});

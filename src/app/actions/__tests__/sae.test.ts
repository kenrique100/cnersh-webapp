/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/notify-admins", () => ({ notifyAdmins: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    user: {},
    project: {},
    sAEReport: {},
  },
}));

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { getAllSAEReports, getProjectSAEReports, reportSAE } from "@/app/actions/sae";

const authMock = authSession as jest.Mock;
const notifyMock = notifyAdmins as jest.Mock;
const mockDb = db as unknown as Record<string, any>;

function login(id = "owner-1", role = "user") {
  authMock.mockResolvedValue({ user: { id } });
  mockDb.user.findUnique.mockResolvedValue({ role });
}

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "project-1",
    title: "Protocol",
    userId: "owner-1",
    status: "APPROVED",
    ...overrides,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "project-1",
    eventType: "SERIOUS_ADVERSE_EVENT" as const,
    eventDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    description: "Participant hospitalized",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(mockDb));
  mockDb.user = { findUnique: jest.fn() };
  mockDb.project = { findUnique: jest.fn() };
  mockDb.sAEReport = { create: jest.fn(), findMany: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };
  notifyMock.mockResolvedValue(undefined);
});

test("SAE input rejects invalid enum, empty description, invalid and future dates", async () => {
  login();
  await expect(reportSAE(input({ eventType: "INVALID" }) as never)).rejects.toThrow();
  await expect(reportSAE(input({ description: " " }))).rejects.toThrow("description");
  await expect(reportSAE(input({ eventDate: "bad" }))).rejects.toThrow("valid date");
  await expect(reportSAE(input({
    eventDate: new Date(Date.now() + 60_000).toISOString(),
  }))).rejects.toThrow("future");
});

test("SAEs require approved source state even for an owner", async () => {
  login();
  mockDb.project.findUnique.mockResolvedValue(project({ status: "UNDER_APPEAL" }));
  await expect(reportSAE(input())).rejects.toThrow("approved protocols");
});

test("SAE report and audit records are committed atomically", async () => {
  login();
  const reportedAt = new Date();
  mockDb.project.findUnique
    .mockResolvedValueOnce(project())
    .mockResolvedValueOnce({ status: "APPROVED" });
  mockDb.sAEReport.create.mockResolvedValue({ id: "sae-1", reportedAt });

  await expect(reportSAE(input())).resolves.toEqual({
    id: "sae-1",
    isLate: false,
    reportedAt: reportedAt.toISOString(),
  });
  expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
  expect(mockDb.sAEReport.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      description: "Participant hospitalized",
      isLate: false,
    }),
  }));
  expect(mockDb.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ action: "SAE_REPORTED" }),
  }));
  expect(notifyMock).toHaveBeenCalledTimes(1);
});

test("late critical SAE gets compliance audit and urgent notification", async () => {
  login();
  const reportedAt = new Date();
  mockDb.project.findUnique
    .mockResolvedValueOnce(project())
    .mockResolvedValueOnce({ status: "APPROVED" });
  mockDb.sAEReport.create.mockResolvedValue({ id: "sae-1", reportedAt });

  const result = await reportSAE(input({
    eventType: "FATAL",
    eventDate: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  }));
  expect(result.isLate).toBe(true);
  expect(mockDb.auditLog.create).toHaveBeenCalledTimes(2);
  expect(notifyMock).toHaveBeenCalledTimes(2);
});

test("notification failure does not roll back a committed report", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  login();
  const reportedAt = new Date();
  mockDb.project.findUnique
    .mockResolvedValueOnce(project())
    .mockResolvedValueOnce({ status: "APPROVED" });
  mockDb.sAEReport.create.mockResolvedValue({ id: "sae-1", reportedAt });
  notifyMock.mockRejectedValue(new Error("mail unavailable"));
  await expect(reportSAE(input())).resolves.toEqual(expect.objectContaining({ id: "sae-1" }));
  expect(consoleError).toHaveBeenCalled();
  consoleError.mockRestore();
});

test("SAE reads enforce project access and hide reports for deleted projects globally", async () => {
  login("other", "user");
  mockDb.project.findUnique.mockResolvedValue({ userId: "owner-1" });
  await expect(getProjectSAEReports("project-1")).rejects.toThrow("Forbidden");

  login("admin-1", "admin");
  mockDb.sAEReport.findMany.mockResolvedValue([]);
  await getAllSAEReports();
  expect(mockDb.sAEReport.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { project: { deleted: false } },
  }));
});

/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ verifiedAuthSession: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    user: {},
    project: {},
    sAEReport: {},
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
  getAllSAEReports,
  getProjectSAEReports,
  reportSAE,
} from "@/app/actions/sae";

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

  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
      callback(mockDb)
  );

  mockDb.user = {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  };
  mockDb.project = { findUnique: jest.fn() };
  mockDb.sAEReport = { create: jest.fn(), findMany: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };
  mockDb.notification = { createMany: jest.fn() };

  getReviewerMock.mockResolvedValue(null);
  emailMock.mockResolvedValue(undefined);
});

test("SAE input rejects invalid enum, empty description, invalid and future dates", async () => {
  login();
  await expect(
      reportSAE(input({ eventType: "INVALID" }) as never)
  ).rejects.toThrow();
  await expect(reportSAE(input({ description: " " }))).rejects.toThrow(
      "description"
  );
  await expect(reportSAE(input({ eventDate: "bad" }))).rejects.toThrow(
      "valid date"
  );
  await expect(
      reportSAE(
          input({
            eventDate: new Date(Date.now() + 60_000).toISOString(),
          })
      )
  ).rejects.toThrow("future");
});

test("SAEs require approved source state even for an owner", async () => {
  login();
  mockDb.project.findUnique.mockResolvedValue(
      project({ status: "UNDER_APPEAL" })
  );
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
  expect(mockDb.sAEReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "Participant hospitalized",
          isLate: false,
        }),
      })
  );
  expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "SAE_REPORTED" }),
      })
  );
});

test("late critical SAE gets compliance audit and urgent notification to superadmins", async () => {
  login();
  const reportedAt = new Date();
  mockDb.project.findUnique
      .mockResolvedValueOnce(project())
      .mockResolvedValueOnce({ status: "APPROVED" });
  mockDb.sAEReport.create.mockResolvedValue({ id: "sae-1", reportedAt });
  mockDb.user.findMany.mockResolvedValue([
    { id: "super-1", email: "super@example.com", name: "Super" },
  ]);

  const result = await reportSAE(
      input({
        eventType: "FATAL",
        eventDate: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      })
  );

  expect(result.isLate).toBe(true);
  // two audit entries: SAE_LATE_REPORT + SAE_REPORTED
  expect(mockDb.auditLog.create).toHaveBeenCalledTimes(2);
  // two notification batches: normal + urgent
  expect(mockDb.notification.createMany).toHaveBeenCalledTimes(2);
  expect(emailMock).toHaveBeenCalled();
});

test("notification failure does not roll back a committed report", async () => {
  const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  login();
  const reportedAt = new Date();
  mockDb.project.findUnique
      .mockResolvedValueOnce(project())
      .mockResolvedValueOnce({ status: "APPROVED" });
  mockDb.sAEReport.create.mockResolvedValue({ id: "sae-1", reportedAt });
  mockDb.user.findMany.mockRejectedValue(new Error("mail unavailable"));

  await expect(reportSAE(input())).resolves.toEqual(
      expect.objectContaining({ id: "sae-1" })
  );
  expect(consoleError).toHaveBeenCalled();
  consoleError.mockRestore();
});

test("getProjectSAEReports forbids non-owner non-reviewer non-superadmin", async () => {
  login("other", "user");
  mockDb.project.findUnique.mockResolvedValue({ userId: "owner-1" });
  getReviewerMock.mockResolvedValue(null);

  await expect(getProjectSAEReports("project-1")).rejects.toThrow("Forbidden");
});

test("getProjectSAEReports allows the current reviewer", async () => {
  login("reviewer-1", "admin");
  mockDb.project.findUnique.mockResolvedValue({ userId: "owner-1" });
  getReviewerMock.mockResolvedValue({ reviewerId: "reviewer-1" });
  mockDb.sAEReport.findMany.mockResolvedValue([]);

  await expect(getProjectSAEReports("project-1")).resolves.toEqual([]);
});

test("getAllSAEReports scopes a regular admin to their own protocols", async () => {
  login("admin-1", "admin");
  mockDb.sAEReport.findMany.mockResolvedValue([]);

  await getAllSAEReports();

  expect(mockDb.sAEReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          project: {
            deleted: false,
            reviewAssignments: {
              some: {
                reviewerId: "admin-1",
                status: {
                  in: ["PENDING_COI", "ACTIVE", "COMPLETED"],
                },
              },
            },
          },
        },
      })
  );
});

test("getAllSAEReports lets the superadmin see all reports", async () => {
  login("super-1", "superadmin");
  mockDb.sAEReport.findMany.mockResolvedValue([]);

  await getAllSAEReports();

  expect(mockDb.sAEReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { project: { deleted: false } },
      })
  );
});
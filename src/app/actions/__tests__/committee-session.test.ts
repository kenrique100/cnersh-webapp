/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    user: {},
    committeeSession: {},
  },
}));

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import {
  createCommitteeSession,
  getCommitteeSessions,
  updateSessionStatus,
} from "@/app/actions/session";

const authMock = authSession as jest.Mock;
const mockDb = db as unknown as Record<string, any>;
const futureDate = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

function login(role = "admin") {
  authMock.mockResolvedValue({ user: { id: "admin-1" } });
  mockDb.user.findUnique.mockResolvedValue({ role });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(mockDb));
  mockDb.user = { findUnique: jest.fn() };
  mockDb.committeeSession = {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findMany: jest.fn(),
  };
  mockDb.reviewAssignment = { groupBy: jest.fn().mockResolvedValue([]) };
  mockDb.project = {
    updateMany: jest.fn(),
    findMany: jest.fn(),
  };
  mockDb.projectStatusHistory = { createMany: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };
});

test("session creation requires admin and a valid future date", async () => {
  login("user");
  await expect(createCommitteeSession({
    sessionType: "ORDINARY",
    sessionDate: futureDate(),
  })).rejects.toThrow("Forbidden");

  login();
  await expect(createCommitteeSession({
    sessionType: "ORDINARY",
    sessionDate: "not-a-date",
  })).rejects.toThrow("valid date");
  await expect(createCommitteeSession({
    sessionType: "ORDINARY",
    sessionDate: new Date(Date.now() - 1000).toISOString(),
  })).rejects.toThrow("future");
});

test("session creation atomically schedules only protocols with two completed reviews", async () => {
  login();
  const date = futureDate();
  const created = {
    id: "session-1",
    sessionType: "ORDINARY",
    sessionDate: new Date(date),
    agenda: ["project-1"],
    status: "SCHEDULED",
  };
  mockDb.committeeSession.findUnique.mockResolvedValue(null);
  mockDb.reviewAssignment.groupBy.mockResolvedValue([
    { projectId: "project-1", _count: { _all: 2 } },
    { projectId: "project-2", _count: { _all: 1 } },
  ]);
  mockDb.committeeSession.create.mockResolvedValue(created);
  mockDb.project.updateMany.mockResolvedValue({ count: 1 });

  await expect(createCommitteeSession({
    sessionType: "ORDINARY",
    sessionDate: date,
  })).resolves.toBe(created);

  expect(mockDb.reviewAssignment.groupBy).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      status: "COMPLETED",
      project: { status: "REVIEW_COMPLETE", deleted: false },
    }),
  }));
  expect(mockDb.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ status: "REVIEW_COMPLETE" }),
    data: { status: "SESSION_SCHEDULED" },
  }));
  expect(mockDb.projectStatusHistory.createMany).toHaveBeenCalled();
  expect(mockDb.auditLog.create).toHaveBeenCalled();
});

test("identical session creation retry returns existing session without side effects", async () => {
  login();
  const existing = { id: "session-1", status: "SCHEDULED", agenda: [] };
  mockDb.committeeSession.findUnique.mockResolvedValue(existing);
  await expect(createCommitteeSession({
    sessionType: "EXTRAORDINARY",
    sessionDate: futureDate(),
  })).resolves.toBe(existing);
  expect(mockDb.committeeSession.create).not.toHaveBeenCalled();
  expect(mockDb.auditLog.create).not.toHaveBeenCalled();
});

test("status transition matrix rejects terminal or skipped transitions", async () => {
  login();
  mockDb.committeeSession.findUnique.mockResolvedValue({
    id: "session-1",
    status: "SCHEDULED",
    agenda: [],
    quorumMet: null,
    minutes: null,
  });
  await expect(updateSessionStatus("session-1", "COMPLETED", {
    quorumMet: true,
    minutes: "Minutes",
  })).rejects.toThrow("Illegal committee session transition");
});

test("completion requires quorum and minutes", async () => {
  login();
  mockDb.committeeSession.findUnique.mockResolvedValue({
    id: "session-1",
    status: "IN_PROGRESS",
    agenda: [],
    quorumMet: false,
    minutes: null,
  });
  await expect(updateSessionStatus("session-1", "COMPLETED"))
    .rejects.toThrow("Quorum");
});

test("cancellation atomically reverts only current agenda projects and records history", async () => {
  login();
  const current = {
    id: "session-1",
    status: "SCHEDULED",
    agenda: ["project-1", "deleted-project"],
    quorumMet: null,
    minutes: null,
  };
  const updated = { ...current, status: "CANCELLED" };
  mockDb.committeeSession.findUnique.mockResolvedValue(current);
  mockDb.committeeSession.findUniqueOrThrow.mockResolvedValue(updated);
  mockDb.project.findMany.mockResolvedValue([{ id: "project-1" }]);
  mockDb.project.updateMany.mockResolvedValue({ count: 1 });

  await expect(updateSessionStatus("session-1", "CANCELLED", { notes: "Weather" }))
    .resolves.toBe(updated);
  expect(mockDb.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ deleted: false, status: "SESSION_SCHEDULED" }),
  }));
  expect(mockDb.projectStatusHistory.createMany).toHaveBeenCalledWith({
    data: [expect.objectContaining({ projectId: "project-1", status: "REVIEW_COMPLETE" })],
  });
  expect(mockDb.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ action: "SESSION_CANCELLED" }),
  }));
});

test("session listing validates runtime status", async () => {
  login();
  await expect(getCommitteeSessions("INVALID" as never)).rejects.toThrow();
  expect(mockDb.committeeSession.findMany).not.toHaveBeenCalled();
});

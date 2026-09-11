/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    reviewAssignment: {},
    evaluationReport: {},
    user: {},
    project: {},
  },
}));

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import {
  getMyEvaluationReport,
  getProjectEvaluationReports,
  saveEvaluationDraft,
  submitEvaluationReport,
} from "@/app/actions/evaluation";

const authMock = authSession as jest.Mock;
const mockDb = db as unknown as Record<string, any>;
const validScores = {
  socialValue: 4,
  scientificValidity: 4,
  riskBenefitAnalysis: 4,
  participantSelection: 4,
  informedConsentProcess: 4,
  confidentialityDataProtection: 4,
  collaborativePartnership: 4,
  recommendation: "FAVORABLE" as const,
};

function login(id = "reviewer-1", role = "admin") {
  authMock.mockResolvedValue({ user: { id, role } });
}

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: "assignment-1",
    reviewerId: "reviewer-1",
    status: "ACTIVE",
    coiDeclaration: { hasCOI: false },
    evaluationReport: null,
    project: {
      id: "project-1",
      title: "Protocol",
      deleted: false,
      status: "UNDER_REVIEW",
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(mockDb));
  mockDb.reviewAssignment = {
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(1),
  };
  mockDb.evaluationReport = {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };
  mockDb.project = {
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    findUnique: jest.fn(),
  };
  mockDb.projectStatusHistory = { create: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };
  mockDb.user = { findUnique: jest.fn() };
});

test("draft validation rejects out-of-range scores before database access", async () => {
  login();
  await expect(saveEvaluationDraft("assignment-1", { socialValue: 6 }))
    .rejects.toThrow("Too big");
  expect(mockDb.$transaction).not.toHaveBeenCalled();
});

test("excluded reviewers cannot save drafts", async () => {
  login();
  mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment({
    status: "EXCLUDED",
    coiDeclaration: { hasCOI: true },
  }));
  await expect(saveEvaluationDraft("assignment-1", { socialValue: 3 }))
    .rejects.toThrow("Excluded reviewers");
});

test("draft is transactionally upserted only after a no-COI declaration", async () => {
  login();
  mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment());
  mockDb.evaluationReport.upsert.mockResolvedValue({ id: "report-1", status: "DRAFT" });

  await saveEvaluationDraft("assignment-1", {
    socialValue: 3,
    additionalCriteria: { community: 4 },
  });

  expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
  expect(mockDb.evaluationReport.upsert).toHaveBeenCalledWith(expect.objectContaining({
    where: { assignmentId: "assignment-1" },
    create: expect.objectContaining({ reviewerId: "reviewer-1", status: "DRAFT" }),
  }));
});

test("submission is atomic and advances the project only after two completed reviews", async () => {
  login();
  const submittedAt = new Date();
  mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment());
  mockDb.evaluationReport.upsert.mockResolvedValue({
    id: "report-1",
    status: "SUBMITTED",
    submittedAt,
  });
  mockDb.reviewAssignment.count.mockResolvedValue(2);
  mockDb.project.updateMany.mockResolvedValue({ count: 1 });

  const result = await submitEvaluationReport("assignment-1", validScores);

  expect(result).toEqual({ id: "report-1", submittedAt: submittedAt.toISOString() });
  expect(mockDb.reviewAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ status: "ACTIVE" }),
    data: { status: "COMPLETED" },
  }));
  expect(mockDb.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      deleted: false,
      status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
    }),
    data: { status: "REVIEW_COMPLETE" },
  }));
  expect(mockDb.projectStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "REVIEW_COMPLETE" }),
  }));
  expect(mockDb.auditLog.create).toHaveBeenCalled();
});

test("repeated submitted evaluation returns the immutable report without duplicate audit", async () => {
  login();
  const report = { id: "report-1", status: "SUBMITTED", submittedAt: new Date() };
  mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment({
    status: "COMPLETED",
    evaluationReport: report,
  }));

  const result = await submitEvaluationReport("assignment-1", validScores);
  expect(result.id).toBe("report-1");
  expect(mockDb.evaluationReport.upsert).not.toHaveBeenCalled();
  expect(mockDb.auditLog.create).not.toHaveBeenCalled();
});

test("personal report lookup denies excluded assignments", async () => {
  login();
  mockDb.reviewAssignment.findUnique.mockResolvedValue({
    reviewerId: "reviewer-1",
    status: "EXCLUDED",
    project: { deleted: false },
  });
  await expect(getMyEvaluationReport("assignment-1")).rejects.toThrow("Excluded reviewers");
});

test("admin project reports are scoped to submitted, completed, non-deleted work", async () => {
  login("admin-1");
  mockDb.user.findUnique.mockResolvedValue({ role: "admin" });
  mockDb.project.findUnique.mockResolvedValue({ id: "project-1" });
  mockDb.evaluationReport.findMany.mockResolvedValue([]);

  await getProjectEvaluationReports("project-1");
  expect(mockDb.evaluationReport.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: {
      status: "SUBMITTED",
      assignment: { projectId: "project-1", status: "COMPLETED" },
    },
  }));
});

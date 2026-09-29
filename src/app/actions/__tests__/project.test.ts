/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({ verifiedAuthSession: jest.fn() }));

jest.mock("@/lib/notify-admins", () => ({
  notifyAdmins: jest.fn().mockResolvedValue(undefined),
  notifyOwnerRenewalDue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/send-notification-email", () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/idempotency-store", () => ({
  reserveIdempotencyKey: jest.fn().mockResolvedValue({ status: "available" }),
  storeIdempotentResponse: jest.fn().mockResolvedValue(undefined),
  releaseIdempotencyKey: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/action-rate-limit", () => ({
  enforceActionRateLimit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: {
    protocolTrack: { points: 10, duration: 60 },
  },
}));

jest.mock("@/lib/status-transitions", () => {
  const PROJECT_TRANSITIONS: Record<string, string[]> = {
    SUBMITTED: ["RETURNED_INCOMPLETE", "PENDING_REVIEW"],
    RETURNED_INCOMPLETE: ["PENDING_REVIEW"],
    RESUBMIT: ["PENDING_REVIEW"],
    REVIEW_COMPLETE: [
      "SESSION_SCHEDULED",
      "APPROVED",
      "APPROVED_WITH_CONDITIONS",
      "RESUBMIT",
    ],
    SESSION_SCHEDULED: [
      "APPROVED",
      "APPROVED_WITH_CONDITIONS",
      "RESUBMIT",
    ],
  };
  return {
    APPROVAL_STATUSES: ["APPROVED", "APPROVED_WITH_CONDITIONS"],
    ASSIGNABLE_PROJECT_STATUSES: [
      "SUBMITTED",
      "RETURNED_INCOMPLETE",
      "PENDING_REVIEW",
      "UNDER_REVIEW",
    ],
    OWNER_MUTABLE_STATUSES: ["DRAFT", "RETURNED_INCOMPLETE"],
    OWNER_RESUBMIT_STATUSES: ["RETURNED_INCOMPLETE", "RESUBMIT"],
    isLegalTransition: (from: string, to: string) =>
        (PROJECT_TRANSITIONS[from] ?? []).includes(to),
    requiresFeedback: (status: string) =>
        ["RESUBMIT", "RETURNED_INCOMPLETE", "APPROVED_WITH_CONDITIONS"].includes(
            status
        ),
  };
});

jest.mock("@/lib/reviewer-assignment", () => ({
  ACTIVE_ASSIGNMENT_STATUSES: ["PENDING_COI", "ACTIVE"],
  autoReassignReviewer: jest
      .fn()
      .mockResolvedValue({ assignedReviewer: null, previousReviewerId: null }),
  getEligibleReviewers: jest.fn().mockResolvedValue([]),
  getReviewerLoads: jest.fn().mockResolvedValue(new Map()),
  pickLowestLoadReviewer: jest.fn().mockReturnValue(null),
  selectReviewerForProtocol: jest.fn().mockResolvedValue(null),
  hasActiveAssignment: jest.fn().mockResolvedValue(null),
  getCurrentReviewer: jest.fn().mockResolvedValue(null),
  isCurrentReviewer: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/db", () => {
  const mockDb = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    reviewAssignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    projectStatusHistory: { create: jest.fn() },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    post: { create: jest.fn() },
  };

  mockDb.$transaction = jest.fn(
      async (cb: (tx: typeof mockDb) => unknown) => cb(mockDb)
  );

  return { db: mockDb };
});

type MockedFn = jest.Mock;
type MockedTable = { [method: string]: MockedFn };
type MockDb = {
  $transaction: MockedFn;
  user: MockedTable;
  project: MockedTable;
  reviewAssignment: MockedTable;
  projectStatusHistory: MockedTable;
  notification: MockedTable;
  auditLog: MockedTable;
  post: MockedTable;
};

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import {
  reserveIdempotencyKey,
  storeIdempotentResponse,
  releaseIdempotencyKey,
} from "@/lib/idempotency-store";
import { selectReviewerForProtocol } from "@/lib/reviewer-assignment";
import {
  assignProjectReviewer,
  deleteProject,
  getProjectById,
  getProjectReviewAssignments,
  reassignProjectReviewer,
  resubmitProtocol,
  submitProject,
  updateProject,
  updateProjectStatus,
} from "@/app/actions/project";

const authMock = verifiedAuthSession as jest.MockedFunction<typeof verifiedAuthSession>;
const notifyMock = notifyAdmins as jest.MockedFunction<typeof notifyAdmins>;
const emailMock = sendNotificationEmail as jest.MockedFunction<typeof sendNotificationEmail>;
const storeMock = storeIdempotentResponse as jest.MockedFunction<typeof storeIdempotentResponse>;
const releaseMock = releaseIdempotencyKey as jest.MockedFunction<typeof releaseIdempotencyKey>;
const selectReviewerMock = selectReviewerForProtocol as jest.MockedFunction<
    typeof selectReviewerForProtocol
>;

type ReserveResult =
    | { status: "available" }
    | { status: "completed"; response: unknown }
    | { status: "in-progress" };

const reserveMock = reserveIdempotencyKey as unknown as jest.Mock<
    Promise<ReserveResult>,
    [unknown]
>;

const mockDb = db as unknown as MockDb;

function login(
    id = "owner-1",
    role: "user" | "admin" | "superadmin" = "user"
) {
  authMock.mockResolvedValue({
    user: { id, name: "User", role },
  } as Awaited<ReturnType<typeof verifiedAuthSession>>);
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
    expiresAt: null,
    reminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: "owner-1", name: "Owner", email: "owner@test.com" },
    reviewAssignments: [],
    statusHistory: [],
    ...overrides,
  };
}

const MOCK_IDEMPOTENCY_KEY = "123e4567-e89b-12d3-a456-426614174000";

beforeEach(() => {
  jest.clearAllMocks();

  mockDb.$transaction.mockImplementation(
      async (cb: (tx: MockDb) => unknown) => cb(mockDb)
  );

  mockDb.user.findUnique.mockResolvedValue(null);
  mockDb.user.findFirst.mockResolvedValue(null);
  mockDb.user.findMany.mockResolvedValue([]);

  mockDb.project.findUnique.mockResolvedValue(null);
  mockDb.project.findUniqueOrThrow.mockResolvedValue(null);
  mockDb.project.findFirst.mockResolvedValue(null);
  mockDb.project.findMany.mockResolvedValue([]);
  mockDb.project.create.mockResolvedValue(null);
  mockDb.project.update.mockResolvedValue(null);
  mockDb.project.updateMany.mockResolvedValue({ count: 1 });

  mockDb.reviewAssignment.findFirst.mockResolvedValue(null);
  mockDb.reviewAssignment.findMany.mockResolvedValue([]);
  mockDb.reviewAssignment.create.mockResolvedValue(null);
  mockDb.reviewAssignment.update.mockResolvedValue(null);
  mockDb.reviewAssignment.updateMany.mockResolvedValue({ count: 1 });
  mockDb.reviewAssignment.groupBy.mockResolvedValue([]);

  mockDb.projectStatusHistory.create.mockResolvedValue({});
  mockDb.notification.create.mockResolvedValue({});
  mockDb.auditLog.create.mockResolvedValue({});
  mockDb.post.create.mockResolvedValue({});

  notifyMock.mockResolvedValue(undefined);
  emailMock.mockResolvedValue(undefined);

  reserveMock.mockResolvedValue({ status: "available" });
  storeMock.mockResolvedValue(undefined);
  releaseMock.mockResolvedValue(undefined);

  // Default: no reviewer available. Tests override per-case.
  selectReviewerMock.mockResolvedValue(null);
});

// ── submitProject ─────────────────────────────────────────────────────

test("submission validates required fields before writing", async () => {
  login();
  const result = await submitProject({
    title: " ",
    description: "Description",
    category: "Health",
    idempotencyKey: MOCK_IDEMPOTENCY_KEY,
  });

  expect(result).toEqual({
    success: false,
    isDuplicate: false,
    reason: "validation",
    error: "Protocol title is required",
  });
  expect(mockDb.$transaction).not.toHaveBeenCalled();
});

test("admin submissions are never auto-approved when no reviewer is available", async () => {
  login("admin-owner", "admin");
  mockDb.project.findFirst.mockResolvedValue(null);
  selectReviewerMock.mockResolvedValue(null);
  const created = project({ userId: "admin-owner", status: "SUBMITTED" });
  mockDb.project.create.mockResolvedValue(created);

  const result = await submitProject({
    title: "Protocol",
    description: "Description",
    category: "Health",
    idempotencyKey: MOCK_IDEMPOTENCY_KEY,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.protocol.status).toBe("SUBMITTED");
  }
  expect(mockDb.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUBMITTED",
          userId: "admin-owner",
        }),
      })
  );
  expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "PROJECT_SUBMITTED" }),
      })
  );
});

test("auto-assign excludes the submitting user and creates a PENDING_COI assignment", async () => {
  login("owner-1");
  mockDb.project.findFirst.mockResolvedValue(null);
  selectReviewerMock.mockResolvedValue({
    id: "admin-2",
    name: "Reviewer",
    email: "reviewer@test.com",
  });
  mockDb.project.create.mockResolvedValue(
      project({ status: "PENDING_REVIEW" })
  );

  const result = await submitProject({
    title: "Protocol",
    description: "Description",
    category: "Health",
    idempotencyKey: MOCK_IDEMPOTENCY_KEY,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.protocol.status).toBe("PENDING_REVIEW");
  }

  expect(selectReviewerMock).toHaveBeenCalledWith(
      expect.objectContaining({ excludeUserIds: ["owner-1"] })
  );

  expect(mockDb.reviewAssignment.create).toHaveBeenCalledWith({
    data: {
      projectId: "project-1",
      reviewerId: "admin-2",
      status: "PENDING_COI",
    },
  });
});

test("submission falls back to SUBMITTED when no eligible reviewer exists", async () => {
  login("owner-1");
  mockDb.project.findFirst.mockResolvedValue(null);
  selectReviewerMock.mockResolvedValue(null);
  mockDb.project.create.mockResolvedValue(project({ status: "SUBMITTED" }));

  const result = await submitProject({
    title: "Protocol",
    description: "Description",
    category: "Health",
    idempotencyKey: MOCK_IDEMPOTENCY_KEY,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.protocol.status).toBe("SUBMITTED");
  }
  expect(mockDb.reviewAssignment.create).not.toHaveBeenCalled();
});

// ── updateProjectStatus ──────────────────────────────────────────────

test("updateProjectStatus forbids a non-reviewer admin (P16)", async () => {
  login("admin-1", "admin");
  mockDb.project.findUnique.mockResolvedValue(
      project({ status: "REVIEW_COMPLETE" })
  );
  mockDb.reviewAssignment.findFirst.mockResolvedValue(null);

  await expect(updateProjectStatus("project-1", "APPROVED")).rejects.toThrow(
      /reviewer|superadmin/i
  );
});

test("updateProjectStatus allows the current reviewer", async () => {
  login("admin-1", "admin");
  const current = project({ status: "REVIEW_COMPLETE" });
  const updated = project({
    status: "APPROVED",
    expiresAt: new Date("2027-01-15T00:00:00.000Z"),
    reminderSentAt: null,
  });

  mockDb.project.findUnique.mockResolvedValue(current);
  mockDb.project.findUniqueOrThrow.mockResolvedValue(updated);
  // First findUnique: acting user role. Second: owner email.
  mockDb.user.findUnique
      .mockResolvedValueOnce({ role: "admin" })
      .mockResolvedValueOnce({ email: "owner@test.com", name: "Owner" });
  // P16 reviewer check → the acting admin IS the reviewer.
  mockDb.reviewAssignment.findFirst.mockResolvedValue({ id: "assignment-1" });

  await expect(updateProjectStatus("project-1", "APPROVED")).resolves.toBe(
      updated
  );

  expect(mockDb.project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deleted: false,
          status: "REVIEW_COMPLETE",
        }),
        data: expect.objectContaining({
          status: "APPROVED",
          feedback: null,
          expiresAt: expect.any(Date),
          reminderSentAt: null,
        }),
      })
  );
});

test("updateProjectStatus lets the superadmin bypass the reviewer check", async () => {
  login("super-1", "superadmin");
  const current = project({ status: "REVIEW_COMPLETE" });
  const updated = project({ status: "APPROVED" });

  mockDb.project.findUnique.mockResolvedValue(current);
  mockDb.project.findUniqueOrThrow.mockResolvedValue(updated);
  mockDb.user.findUnique
      .mockResolvedValueOnce({ role: "superadmin" })
      .mockResolvedValueOnce({ email: "owner@test.com", name: "Owner" });

  await expect(updateProjectStatus("project-1", "APPROVED")).resolves.toBe(
      updated
  );
  expect(mockDb.reviewAssignment.findFirst).not.toHaveBeenCalled();
});

test("project status changes follow the legal source-state matrix and require feedback", async () => {
  login("admin-1", "admin");
  mockDb.project.findUnique.mockResolvedValue(
      project({ status: "REVIEW_COMPLETE" })
  );
  mockDb.reviewAssignment.findFirst.mockResolvedValue({ id: "assignment-1" });

  await expect(
      updateProjectStatus("project-1", "APPROVED_WITH_CONDITIONS")
  ).rejects.toThrow("Feedback is required");
});

// ── ownership / edit / delete ─────────────────────────────────────────

test("only owners may edit or delete, and only before submission or after incomplete return", async () => {
  login();
  mockDb.project.findUnique.mockResolvedValue(project({ status: "SUBMITTED" }));

  await expect(updateProject("project-1", { title: "Changed" })).rejects.toThrow(
      "Submitted protocols cannot be edited"
  );
  await expect(deleteProject("project-1")).rejects.toThrow(
      "Submitted protocols cannot be deleted"
  );

  mockDb.project.findUnique.mockResolvedValue(
      project({ status: "RETURNED_INCOMPLETE" })
  );
  mockDb.project.findUniqueOrThrow.mockResolvedValue(
      project({ title: "Changed" })
  );

  await expect(
      updateProject("project-1", { title: " Changed " })
  ).resolves.toEqual(expect.objectContaining({ title: "Changed" }));
});

// ── getProjectById ────────────────────────────────────────────────────

test("an excluded reviewer cannot regain project access through the admin role", async () => {
  login("reviewer-1", "admin");
  mockDb.project.findUnique.mockResolvedValue(
      project({
        userId: "owner-1",
        reviewAssignments: [
          {
            reviewerId: "reviewer-1",
            status: "EXCLUDED",
            reviewer: {},
            coiDeclaration: { hasCOI: true },
            evaluationReport: null,
          },
        ],
      })
  );

  await expect(getProjectById("project-1")).rejects.toThrow(
      "Forbidden: Excluded reviewers cannot access this protocol"
  );
});

// ── resubmitProtocol ──────────────────────────────────────────────────

test("resubmitProtocol reactivates the sticky reviewer without a fresh COI", async () => {
  login();
  mockDb.project.findUnique.mockResolvedValue({
    id: "project-1",
    userId: "owner-1",
    status: "RESUBMIT",
    title: "Protocol",
  });
  mockDb.reviewAssignment.findFirst.mockResolvedValue({
    id: "assignment-1",
    reviewerId: "reviewer-1",
    reviewer: { id: "reviewer-1", name: "R", email: "r@test.com" },
  });
  mockDb.project.findUniqueOrThrow.mockResolvedValue({
    id: "project-1",
    status: "PENDING_REVIEW",
    title: "Protocol",
    updatedAt: new Date(),
  });

  const result = await resubmitProtocol("project-1");

  expect(result.status).toBe("PENDING_REVIEW");
  expect(mockDb.reviewAssignment.update).toHaveBeenCalledWith({
    where: { id: "assignment-1" },
    data: { status: "ACTIVE", reassignedAt: null },
  });
  // No new PENDING_COI assignment is created (no repeated COI).
  expect(mockDb.reviewAssignment.create).not.toHaveBeenCalled();
});

// ── manual assignment ─────────────────────────────────────────────────

test("manual assignment rejects the protocol owner and previously assigned reviewers", async () => {
  login("president", "superadmin");

  // Case 1: target is the protocol owner
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
  mockDb.reviewAssignment.findFirst.mockResolvedValue(null);

  await expect(assignProjectReviewer("project-1", "owner-1")).rejects.toThrow(
      "Protocol owners cannot review their own protocols"
  );

  // Case 2: target was previously excluded
  mockDb.user.findUnique
      .mockResolvedValueOnce({ role: "superadmin" })
      .mockResolvedValueOnce({
        id: "admin-2",
        name: "Reviewer",
        email: "reviewer@test.com",
        role: "admin",
        banned: false,
      });
  mockDb.project.findUnique.mockResolvedValue(
      project({
        reviewAssignments: [{ reviewerId: "admin-2", status: "EXCLUDED" }],
      })
  );
  mockDb.reviewAssignment.findFirst.mockResolvedValue(null);

  await expect(assignProjectReviewer("project-1", "admin-2")).rejects.toThrow(
      "This reviewer was already assigned or excluded from this protocol"
  );
});

// ── reassignProjectReviewer ───────────────────────────────────────────

test("reassignment hands the excluded list to the reviewer-selection service", async () => {
  login("president", "superadmin");
  mockDb.project.findUnique.mockResolvedValue(
      project({
        status: "UNDER_REVIEW",
        reviewAssignments: [
          { reviewerId: "old-reviewer" },
          { reviewerId: "excluded-before" },
        ],
      })
  );
  mockDb.reviewAssignment.findFirst.mockResolvedValue({
    id: "assignment-1",
    projectId: "project-1",
    reviewerId: "old-reviewer",
    status: "ACTIVE",
    reviewer: { id: "old-reviewer", name: "Old", email: "old@test.com" },
  });
  // selectReviewerForProtocol returns null → hard failure.
  selectReviewerMock.mockResolvedValue(null);

  await expect(reassignProjectReviewer("project-1")).rejects.toThrow(
      /No available admin/i
  );

  expect(selectReviewerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeUserIds: expect.arrayContaining([
          "owner-1",
          "old-reviewer",
          "excluded-before",
        ]),
      })
  );
});

// ── getProjectReviewAssignments ───────────────────────────────────────

test("excluded regular admin cannot list project review assignments", async () => {
  login("reviewer-1", "admin");
  mockDb.project.findUnique.mockResolvedValue({ id: "project-1" });
  mockDb.reviewAssignment.findFirst.mockResolvedValue({
    id: "excluded-assignment",
  });

  await expect(getProjectReviewAssignments("project-1")).rejects.toThrow(
      "Forbidden: Excluded reviewers cannot access review assignments"
  );
});
/* ---------------------------------------------------------------------------
 * src/app/actions/__tests__/project.test.ts
 *
 * No `any` — the mocked DB is typed structurally via MockDb / MockedTable.
 * ------------------------------------------------------------------------ */

// ---------------------------------------------------------------------------
// Module mocks (hoisted above imports by Jest's ts-jest/babel plugin)
// ---------------------------------------------------------------------------

jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));

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

jest.mock("@/lib/db", () => {
  // TS types are erased at compile time, so using `typeof mockDb` inside
  // this hoisted factory is safe — Jest's babel plugin only hoists runtime code.
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
    },
    projectStatusHistory: { create: jest.fn() },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  // `db.$transaction(cb)` runs the callback with the same mocked client,
  // mirroring Prisma's real tx shape for unit tests.
  mockDb.$transaction = jest.fn(
      async (cb: (tx: typeof mockDb) => unknown) => cb(mockDb)
  );

  return { db: mockDb };
});

// ---------------------------------------------------------------------------
// Structural types for the mocked DB
// ---------------------------------------------------------------------------

type MockedFn = jest.Mock;

/**
 * A table of Prisma model methods (e.g. `db.user`) where every property is
 * a Jest mock. The index signature lets tests reference any method name
 * (`findUnique`, `create`, …) without declaring each one twice.
 */
type MockedTable = {
  [method: string]: MockedFn;
};

/**
 * The subset of the Prisma client exercised by this test file. Mirrors the
 * shape returned by the `jest.mock("@/lib/db", …)` factory above.
 */
type MockDb = {
  $transaction: MockedFn;
  user: MockedTable;
  project: MockedTable;
  reviewAssignment: MockedTable;
  projectStatusHistory: MockedTable;
  notification: MockedTable;
  auditLog: MockedTable;
};

// ---------------------------------------------------------------------------
// Imports (resolved against the mocks above)
// ---------------------------------------------------------------------------

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import {
  reserveIdempotencyKey,
  storeIdempotentResponse,
  releaseIdempotencyKey,
} from "@/lib/idempotency-store";
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

// ---------------------------------------------------------------------------
// Typed handles
// ---------------------------------------------------------------------------

const authMock = authSession as jest.MockedFunction<typeof authSession>;
const notifyMock = notifyAdmins as jest.MockedFunction<typeof notifyAdmins>;
const emailMock = sendNotificationEmail as jest.MockedFunction<typeof sendNotificationEmail>;
const storeMock = storeIdempotentResponse as jest.MockedFunction<typeof storeIdempotentResponse>;
const releaseMock = releaseIdempotencyKey as jest.MockedFunction<typeof releaseIdempotencyKey>;

/**
 * The real `reserveIdempotencyKey` signature only advertises
 * `"completed" | "in-progress"`, but the store also returns
 * `{ status: "available" }` for first-time keys (which is why the source
 * code falls through both `if` branches and proceeds to the transaction).
 * We type the mock against what the tests actually use so TypeScript
 * doesn't reject the valid runtime value.
 */
type ReserveResult =
    | { status: "available" }
    | { status: "completed"; response: unknown }
    | { status: "in-progress" };

const reserveMock = reserveIdempotencyKey as unknown as jest.Mock<
    Promise<ReserveResult>,
    [unknown]
>;

const mockDb = db as unknown as MockDb;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function login(id = "owner-1", role: "user" | "admin" | "superadmin" = "user") {
  authMock.mockResolvedValue({
    user: { id, name: "User", role },
  } as Awaited<ReturnType<typeof authSession>>);
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

// ---------------------------------------------------------------------------
// Test setup
//
// `jest.clearAllMocks()` only clears call history, NOT implementations set
// with `mockResolvedValue`. Those leak across tests. We use `resetAllMocks`
// (clears history AND implementations) then re-seed every default.
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.resetAllMocks();

  mockDb.$transaction.mockImplementation(
      async (cb: (tx: MockDb) => unknown) => cb(mockDb)
  );

  // --- User ---
  mockDb.user.findUnique.mockResolvedValue(null);
  mockDb.user.findFirst.mockResolvedValue(null);
  mockDb.user.findMany.mockResolvedValue([]);

  // --- Project ---
  mockDb.project.findUnique.mockResolvedValue(null);
  mockDb.project.findUniqueOrThrow.mockResolvedValue(null);
  mockDb.project.findFirst.mockResolvedValue(null);
  mockDb.project.findMany.mockResolvedValue([]);
  mockDb.project.create.mockResolvedValue(null);
  mockDb.project.update.mockResolvedValue(null);
  mockDb.project.updateMany.mockResolvedValue({ count: 1 });

  // --- ReviewAssignment ---
  mockDb.reviewAssignment.findFirst.mockResolvedValue(null); // ← prevents leaks
  mockDb.reviewAssignment.findMany.mockResolvedValue([]);
  mockDb.reviewAssignment.create.mockResolvedValue(null);
  mockDb.reviewAssignment.update.mockResolvedValue(null);
  mockDb.reviewAssignment.updateMany.mockResolvedValue({ count: 1 });

  // --- Side-effect tables ---
  mockDb.projectStatusHistory.create.mockResolvedValue({});
  mockDb.notification.create.mockResolvedValue({});
  mockDb.auditLog.create.mockResolvedValue({});

  // --- Notification / email transports ---
  notifyMock.mockResolvedValue(undefined);
  emailMock.mockResolvedValue(undefined);

  // --- Idempotency store (was reset by jest.resetAllMocks) ---
  reserveMock.mockResolvedValue({ status: "available" });
  storeMock.mockResolvedValue(undefined);
  releaseMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// submitProject
// ---------------------------------------------------------------------------

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

test("admin submissions are never auto-approved", async () => {
  login("admin-owner", "admin");
  mockDb.project.findFirst.mockResolvedValue(null);
  mockDb.user.findFirst.mockResolvedValue(null);
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

test("available reviewer assignment excludes the submitting admin and is atomic", async () => {
  login("owner-1");
  mockDb.project.findFirst.mockResolvedValue(null);
  // `role: "admin"` is required — findAvailableAdmin calls
  // isAutoAssignableRole(candidate.role) and returns null otherwise.
  mockDb.user.findFirst.mockResolvedValue({
    id: "admin-2",
    name: "Reviewer",
    email: "reviewer@test.com",
    role: "admin",
  });
  mockDb.project.create.mockResolvedValue(project({ status: "PENDING_REVIEW" }));

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

  const findFirstCall = mockDb.user.findFirst.mock.calls[0][0];
  expect(findFirstCall.where.role).toBe("admin");
  expect(findFirstCall.where.id.notIn).toEqual(expect.arrayContaining(["owner-1"]));

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
  mockDb.project.findFirst.mockResolvedValue(null);
  mockDb.user.findFirst.mockResolvedValue({
    id: "admin-2",
    name: "Reviewer",
    email: "reviewer@test.com",
    role: "admin",
  });
  mockDb.reviewAssignment.findFirst.mockResolvedValue({ id: "other-active-assignment" });
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
  expect(mockDb.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUBMITTED" }),
      })
  );
  expect(mockDb.reviewAssignment.create).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// updateProjectStatus
// ---------------------------------------------------------------------------

test("project status changes follow the legal source-state matrix and require feedback", async () => {
  login("admin-1", "admin");
  mockDb.project.findUnique.mockResolvedValue(project({ status: "SUBMITTED" }));

  await expect(updateProjectStatus("project-1", "APPROVED")).rejects.toThrow(
      "Illegal protocol status transition"
  );

  mockDb.project.findUnique.mockResolvedValue(project({ status: "REVIEW_COMPLETE" }));

  await expect(
      updateProjectStatus("project-1", "APPROVED_WITH_CONDITIONS")
  ).rejects.toThrow("Feedback is required");
});

test("legal status transition, history, notification and audit commit together", async () => {
  login("admin-1", "admin");
  const current = project({ status: "REVIEW_COMPLETE" });
  const updated = project({
    status: "APPROVED",
    expiresAt: new Date("2027-01-15T00:00:00.000Z"),
    reminderSentAt: null,
  });

  mockDb.project.findUnique.mockResolvedValue(current);
  mockDb.project.findUniqueOrThrow.mockResolvedValue(updated);
  mockDb.user.findUnique
      .mockResolvedValueOnce({ role: "admin" })
      .mockResolvedValueOnce({ email: "owner@test.com", name: "Owner" });

  await expect(updateProjectStatus("project-1", "APPROVED")).resolves.toBe(updated);

  expect(mockDb.project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deleted: false,
          status: "REVIEW_COMPLETE",
        }),
        // Approval also writes expiresAt + reminderSentAt now.
        data: expect.objectContaining({
          status: "APPROVED",
          feedback: null,
          expiresAt: expect.any(Date),
          reminderSentAt: null,
        }),
      })
  );

  expect(mockDb.projectStatusHistory.create).toHaveBeenCalled();
  expect(mockDb.notification.create).toHaveBeenCalled();
  expect(mockDb.auditLog.create).toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// updateProject / deleteProject
// ---------------------------------------------------------------------------

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
  mockDb.project.findUniqueOrThrow.mockResolvedValue(project({ title: "Changed" }));

  await expect(
      updateProject("project-1", { title: " Changed " })
  ).resolves.toEqual(expect.objectContaining({ title: "Changed" }));

  expect(mockDb.project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "owner-1", deleted: false }),
        data: expect.objectContaining({ title: "Changed" }),
      })
  );
});

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

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

test("manual assignment rejects owner, busy, banned, and previously excluded reviewers", async () => {
  login("president", "superadmin");

  // --- Case 1: target is the protocol owner ---------------------------------
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
  // No active work for this reviewer; the "excluded" check is what we want to hit.
  mockDb.reviewAssignment.findFirst.mockResolvedValue(null);

  await expect(assignProjectReviewer("project-1", "owner-1")).rejects.toThrow(
      "Protocol owners cannot review their own protocols"
  );

  // --- Case 2: target was previously excluded -------------------------------
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
  // CRITICAL: reset the "active work" probe so the function reaches the
  // `alreadyAssigned` branch instead of throwing "already has an active
  // review assignment" from a leaked mock.
  mockDb.reviewAssignment.findFirst.mockResolvedValue(null);

  await expect(assignProjectReviewer("project-1", "admin-2")).rejects.toThrow(
      "This reviewer was already assigned or excluded from this protocol"
  );
});

test("reassignment excludes every prior reviewer from replacement selection", async () => {
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
  mockDb.reviewAssignment.findMany.mockResolvedValue([]);
  mockDb.user.findFirst.mockResolvedValue(null);

  await expect(reassignProjectReviewer("project-1")).rejects.toThrow(
      "No available admin found for reassignment"
  );

  expect(mockDb.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: {
            notIn: expect.arrayContaining([
              "owner-1",
              "old-reviewer",
              "excluded-before",
            ]),
          },
        }),
      })
  );
});

test("excluded regular admin cannot list project review assignments", async () => {
  login("reviewer-1", "admin");
  mockDb.project.findUnique.mockResolvedValue({ id: "project-1" });
  mockDb.reviewAssignment.findFirst.mockResolvedValue({ id: "excluded-assignment" });

  await expect(getProjectReviewAssignments("project-1")).rejects.toThrow(
      "Forbidden: Excluded reviewers cannot access review assignments"
  );
});
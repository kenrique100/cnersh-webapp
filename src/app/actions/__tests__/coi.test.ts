/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({
  verifiedAuthSession: jest.fn(),
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
}));
jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    reviewAssignment: {},
    user: {},
  },
}));
jest.mock("@/lib/reviewer-assignment", () => ({
  autoReassignReviewer: jest.fn(),
  getCurrentReviewer: jest.fn(),
}));
jest.mock("@/lib/send-notification-email", () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { autoReassignReviewer } from "@/lib/reviewer-assignment";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import {
  getMyReviewAssignments,
  submitCOIDeclaration,
} from "@/app/actions/coi";

const authMock = verifiedAuthSession as jest.Mock;
const reassignMock = autoReassignReviewer as jest.Mock;
const emailMock = sendNotificationEmail as jest.Mock;
const mockDb = db as unknown as Record<string, any>;

const input = {
  assignmentId: "assignment-1",
  hasCOI: false,
};

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

  mockDb.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
      callback(mockDb)
  );

  mockDb.reviewAssignment = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    update: jest.fn(),
    create: jest.fn(),
  };

  mockDb.cOIDeclaration = { create: jest.fn() };
  mockDb.project = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
  mockDb.projectStatusHistory = { create: jest.fn() };
  mockDb.auditLog = { create: jest.fn() };
  mockDb.notification = { create: jest.fn(), createMany: jest.fn() };
  mockDb.user = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
  };

  reassignMock.mockResolvedValue({
    assignedReviewer: null,
    previousReviewerId: null,
  });
  emailMock.mockResolvedValue(undefined);
});

describe("COI actions", () => {
  describe("submitCOIDeclaration", () => {
    it("throws if not authenticated", async () => {
      authMock.mockRejectedValue(new Error("Unauthorized"));
      await expect(submitCOIDeclaration(input)).rejects.toThrow("Unauthorized");
    });

    it("throws if not verified", async () => {
      authMock.mockRejectedValue(new Error("EMAIL_NOT_VERIFIED"));
      await expect(submitCOIDeclaration(input)).rejects.toThrow(
          "EMAIL_NOT_VERIFIED"
      );
    });

    it("throws if assignment not found", async () => {
      login();
      mockDb.reviewAssignment.findUnique.mockResolvedValue(null);

      await expect(submitCOIDeclaration(input)).rejects.toThrow(
          "Review assignment not found"
      );
    });

    it("throws if the project is deleted", async () => {
      login();
      mockDb.reviewAssignment.findUnique.mockResolvedValue(
          assignment({
            project: {
              id: "project-1",
              title: "Protocol",
              userId: "owner-1",
              deleted: true,
              status: "PENDING_REVIEW",
            },
          })
      );

      await expect(submitCOIDeclaration(input)).rejects.toThrow(
          "Review assignment not found"
      );
    });

    it("throws if reviewer mismatch", async () => {
      login();
      mockDb.reviewAssignment.findUnique.mockResolvedValue(
          assignment({ reviewerId: "someone-else" })
      );

      await expect(submitCOIDeclaration(input)).rejects.toThrow(
          "Forbidden: You can only submit your own COI declaration"
      );
    });

    it("throws if COI already declared with different values", async () => {
      login();
      mockDb.reviewAssignment.findUnique.mockResolvedValue(
          assignment({
            status: "ACTIVE",
            coiDeclaration: {
              id: "coi-existing",
              hasCOI: true,
              details: "existing",
              declaredAt: new Date(),
            },
          })
      );

      await expect(
          submitCOIDeclaration({ ...input, hasCOI: false })
      ).rejects.toThrow(
          "COI declaration has already been submitted and cannot be changed"
      );
    });

    it("rejects hasCOI=true without details", async () => {
      login();

      await expect(
          submitCOIDeclaration({ assignmentId: "assignment-1", hasCOI: true })
      ).rejects.toThrow("Conflict details are required");
    });

    it("throws when the assignment is not in PENDING_COI", async () => {
      login();
      mockDb.reviewAssignment.findUnique.mockResolvedValue(
          assignment({ status: "ACTIVE" })
      );

      await expect(submitCOIDeclaration(input)).rejects.toThrow(
          "COI declarations cannot be submitted for ACTIVE assignments"
      );
    });

    it("throws when the protocol is not under review", async () => {
      login();
      mockDb.reviewAssignment.findUnique.mockResolvedValue(
          assignment({
            project: {
              id: "project-1",
              title: "Protocol",
              userId: "owner-1",
              deleted: false,
              status: "APPROVED",
            },
          })
      );

      await expect(submitCOIDeclaration(input)).rejects.toThrow(
          "This protocol is not accepting reviewer declarations"
      );
    });

    it("handles NO COI (hasCOI=false): no reassignment, no notifications", async () => {
      login();
      const declaredAt = new Date("2026-09-01T12:00:00Z");

      mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment());
      mockDb.cOIDeclaration.create.mockResolvedValue({
        id: "coi-1",
        hasCOI: false,
        declaredAt,
      });

      const result = await submitCOIDeclaration(input);

      expect(result).toEqual({
        id: "coi-1",
        hasCOI: false,
        declaredAt: declaredAt.toISOString(),
      });

      expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
      expect(mockDb.reviewAssignment.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: "PENDING_COI",
              reviewerId: "reviewer-1",
            }),
            data: { status: "ACTIVE" },
          })
      );
      expect(mockDb.project.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ status: "PENDING_REVIEW" }),
            data: { status: "UNDER_REVIEW" },
          })
      );
      expect(mockDb.projectStatusHistory.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: "UNDER_REVIEW" }),
          })
      );
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ action: "COI_CLEARED" }),
          })
      );
      expect(reassignMock).not.toHaveBeenCalled();
      expect(mockDb.notification.create).not.toHaveBeenCalled();
      expect(mockDb.notification.createMany).not.toHaveBeenCalled();
      expect(emailMock).not.toHaveBeenCalled();
    });

    it("handles COI (hasCOI=true) and notifies the replacement reviewer", async () => {
      login();
      const declaredAt = new Date();
      const replacement = {
        id: "reviewer-2",
        name: "Replacement",
        email: "replacement@example.com",
      };

      mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment());
      mockDb.cOIDeclaration.create.mockResolvedValue({
        id: "coi-2",
        hasCOI: true,
        declaredAt,
      });
      reassignMock.mockResolvedValue({
        assignedReviewer: replacement,
        previousReviewerId: "reviewer-1",
      });

      await submitCOIDeclaration({
        assignmentId: "assignment-1",
        hasCOI: true,
        details: "Close collaborator",
      });

      expect(mockDb.reviewAssignment.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({ data: { status: "EXCLUDED" } })
      );
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ action: "COI_DECLARED" }),
          })
      );
      expect(reassignMock).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: "project-1",
            reason: expect.stringContaining("conflict of interest"),
          })
      );
      expect(mockDb.notification.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type: "REVIEW_ASSIGNED",
              userId: "reviewer-2",
            }),
          })
      );
      expect(emailMock).toHaveBeenCalledWith(
          expect.objectContaining({ to: "replacement@example.com" })
      );
      expect(mockDb.notification.createMany).not.toHaveBeenCalled();
    });

    it("notifies superadmins when no replacement reviewer is available", async () => {
      login();
      const declaredAt = new Date();

      mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment());
      mockDb.cOIDeclaration.create.mockResolvedValue({
        id: "coi-3",
        hasCOI: true,
        declaredAt,
      });
      reassignMock.mockResolvedValue({
        assignedReviewer: null,
        previousReviewerId: "reviewer-1",
      });
      mockDb.user.findMany.mockResolvedValue([
        { id: "super-1", email: "super@example.com", name: "Super" },
      ]);

      await submitCOIDeclaration({
        assignmentId: "assignment-1",
        hasCOI: true,
        details: "Close collaborator",
      });

      expect(mockDb.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ role: "superadmin" }),
          })
      );
      expect(mockDb.notification.createMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({ userId: "super-1" }),
            ]),
          })
      );
      expect(mockDb.notification.create).not.toHaveBeenCalled();
    });

    it("is idempotent for the exact same declaration retry", async () => {
      login();
      const existing = {
        id: "coi-1",
        hasCOI: false,
        details: null,
        declaredAt: new Date(),
      };

      mockDb.reviewAssignment.findUnique.mockResolvedValue(
          assignment({ status: "ACTIVE", coiDeclaration: existing })
      );

      const result = await submitCOIDeclaration(input);

      expect(result.id).toBe("coi-1");
      expect(mockDb.cOIDeclaration.create).not.toHaveBeenCalled();
      expect(mockDb.auditLog.create).not.toHaveBeenCalled();
      expect(reassignMock).not.toHaveBeenCalled();
      expect(emailMock).not.toHaveBeenCalled();
    });
  });

  describe("getMyReviewAssignments", () => {
    it("throws if not authenticated", async () => {
      authMock.mockRejectedValue(new Error("Unauthorized"));
      await expect(getMyReviewAssignments()).rejects.toThrow("Unauthorized");
    });

    it("returns assignments for the current user", async () => {
      login();
      const rows = [
        {
          id: "assignment-1",
          project: {
            id: "project-1",
            title: "Protocol",
            category: "clinical",
            status: "PENDING_REVIEW",
            trackingCode: "CNERSH-2026-AAAAAAAA",
            createdAt: new Date(),
          },
          coiDeclaration: null,
          evaluationReport: null,
        },
      ];
      mockDb.reviewAssignment.findMany.mockResolvedValue(rows);

      const result = await getMyReviewAssignments();

      expect(mockDb.reviewAssignment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              reviewerId: "reviewer-1",
              project: { deleted: false },
            },
          })
      );
      expect(result).toEqual(rows);
    });

    it("excludes deleted projects in the query filter", async () => {
      login();
      mockDb.reviewAssignment.findMany.mockResolvedValue([]);

      await getMyReviewAssignments();

      expect(mockDb.reviewAssignment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              reviewerId: "reviewer-1",
              project: { deleted: false },
            },
          })
      );
    });
  });
});
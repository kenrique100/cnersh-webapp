/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/db", () => ({
    db: {
        user: { findMany: jest.fn() },
        reviewAssignment: {
            groupBy: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        project: { findUnique: jest.fn() },
        auditLog: { create: jest.fn() },
    },
}));

import { db } from "@/lib/db";
import { ReviewAssignmentStatus } from "@/generated/prisma";
import {
    ACTIVE_ASSIGNMENT_STATUSES,
    autoReassignReviewer,
    getCurrentReviewer,
    getEligibleReviewers,
    getReviewerLoads,
    hasActiveAssignment,
    isCurrentReviewer,
    pickLowestLoadReviewer,
    selectReviewerForProtocol,
    type EligibleReviewer,
} from "@/lib/reviewer-assignment";

const mockDb = db as unknown as {
    user: { findMany: jest.Mock };
    reviewAssignment: {
        groupBy: jest.Mock;
        findFirst: jest.Mock;
        findMany: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
    };
    project: { findUnique: jest.Mock };
    auditLog: { create: jest.Mock };
};

beforeEach(() => {
    jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getEligibleReviewers
// ---------------------------------------------------------------------------

describe("getEligibleReviewers", () => {
    it("returns only role=admin users (superadmins excluded by the role filter)", async () => {
        mockDb.user.findMany.mockResolvedValue([
            { id: "a1", name: "Alice", email: "a1@x", role: "admin" },
            { id: "s1", name: "Super", email: "s1@x", role: "superadmin" },
            { id: "u1", name: "User", email: "u1@x", role: "user" },
        ]);

        const reviewers = await getEligibleReviewers();

        expect(reviewers).toEqual([
            { id: "a1", name: "Alice", email: "a1@x" },
        ]);
        expect(mockDb.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    role: "admin",
                    OR: [{ banned: false }, { banned: null }],
                }),
            })
        );
    });

    it("passes excludeUserIds through to notIn", async () => {
        mockDb.user.findMany.mockResolvedValue([]);

        await getEligibleReviewers({ excludeUserIds: ["x1", "x2"] });

        expect(mockDb.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    id: { notIn: ["x1", "x2"] },
                }),
            })
        );
    });

    it("omits the notIn clause when excludeUserIds is empty", async () => {
        mockDb.user.findMany.mockResolvedValue([]);

        await getEligibleReviewers({ excludeUserIds: [] });

        const call = mockDb.user.findMany.mock.calls[0][0];
        expect(call.where.id).toBeUndefined();
    });

    it("uses the provided transaction client when tx is passed", async () => {
        const tx = {
            user: { findMany: jest.fn().mockResolvedValue([]) },
        } as any;

        await getEligibleReviewers({ tx });

        expect(tx.user.findMany).toHaveBeenCalled();
        expect(mockDb.user.findMany).not.toHaveBeenCalled();
    });

    it("drops rows whose role is not auto-assignable even if the DB returned them", async () => {
        // Simulate a DB filter that did not restrict role correctly.
        mockDb.user.findMany.mockResolvedValue([
            { id: "a1", name: "A", email: "a@x", role: "admin" },
            { id: "s1", name: "S", email: "s@x", role: "superadmin" },
            { id: "u1", name: "U", email: "u@x", role: "user" },
            { id: "n1", name: "N", email: "n@x", role: null },
        ]);

        const reviewers = await getEligibleReviewers();

        expect(reviewers.map((r) => r.id)).toEqual(["a1"]);
    });
});

// ---------------------------------------------------------------------------
// getReviewerLoads
// ---------------------------------------------------------------------------

describe("getReviewerLoads", () => {
    it("returns a Map keyed by reviewerId with their load", async () => {
        mockDb.reviewAssignment.groupBy.mockResolvedValue([
            { reviewerId: "a1", _count: { _all: 3 } },
            { reviewerId: "a2", _count: { _all: 1 } },
        ]);

        const loads = await getReviewerLoads();

        expect(loads.get("a1")).toBe(3);
        expect(loads.get("a2")).toBe(1);
        expect(loads.get("a3")).toBeUndefined();
    });

    it("filters only by active statuses when no reviewerIds are passed", async () => {
        mockDb.reviewAssignment.groupBy.mockResolvedValue([]);

        await getReviewerLoads();

        const call = mockDb.reviewAssignment.groupBy.mock.calls[0][0];
        expect(call.where.status.in).toEqual(
            ACTIVE_ASSIGNMENT_STATUSES as unknown as ReviewAssignmentStatus[]
        );
        expect(call.where.reviewerId).toBeUndefined();
    });

    it("limits to the given reviewerIds when passed", async () => {
        mockDb.reviewAssignment.groupBy.mockResolvedValue([]);

        await getReviewerLoads({ reviewerIds: ["a1", "a2"] });

        const call = mockDb.reviewAssignment.groupBy.mock.calls[0][0];
        expect(call.where.reviewerId).toEqual({ in: ["a1", "a2"] });
    });

    it("uses the transaction client when passed", async () => {
        const tx = {
            reviewAssignment: { groupBy: jest.fn().mockResolvedValue([]) },
        } as any;

        await getReviewerLoads({ tx });

        expect(tx.reviewAssignment.groupBy).toHaveBeenCalled();
        expect(mockDb.reviewAssignment.groupBy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// pickLowestLoadReviewer
// ---------------------------------------------------------------------------

describe("pickLowestLoadReviewer", () => {
    const candidates: EligibleReviewer[] = [
        { id: "a", name: "A", email: "a@x" },
        { id: "b", name: "B", email: "b@x" },
        { id: "c", name: "C", email: "c@x" },
    ];

    afterEach(() => {
        jest.spyOn(Math, "random").mockRestore();
    });

    it("returns null for an empty candidate list", () => {
        expect(pickLowestLoadReviewer([], new Map())).toBeNull();
    });

    it("returns the unique lowest-load candidate", () => {
        const loads = new Map<string, number>([
            ["a", 5],
            ["b", 1],
            ["c", 3],
        ]);
        expect(pickLowestLoadReviewer(candidates, loads)?.id).toBe("b");
    });

    it("treats missing load as 0", () => {
        const loads = new Map<string, number>([["a", 4]]);
        // b and c both default to 0; Math.random = 0 => first of tied.
        jest.spyOn(Math, "random").mockReturnValue(0);
        expect(pickLowestLoadReviewer(candidates, loads)?.id).toBe("b");
    });

    it("breaks a tie uniformly: Math.random = 0 picks the first tied candidate", () => {
        const loads = new Map<string, number>([
            ["a", 0],
            ["b", 0],
            ["c", 0],
        ]);
        jest.spyOn(Math, "random").mockReturnValue(0);
        expect(pickLowestLoadReviewer(candidates, loads)?.id).toBe("a");
    });

    it("breaks a tie: Math.random near 1 picks the last tied candidate", () => {
        const loads = new Map<string, number>([
            ["a", 0],
            ["b", 0],
            ["c", 0],
        ]);
        jest.spyOn(Math, "random").mockReturnValue(0.9999);
        expect(pickLowestLoadReviewer(candidates, loads)?.id).toBe("c");
    });

    it("ignores higher-load candidates when choosing among ties", () => {
        const loads = new Map<string, number>([
            ["a", 2],
            ["b", 2],
            ["c", 5],
        ]);
        // Ties only on a and b. Math.random = 0.5 * 2 => index 1 => b.
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        expect(pickLowestLoadReviewer(candidates, loads)?.id).toBe("b");
    });
});

// ---------------------------------------------------------------------------
// selectReviewerForProtocol
// ---------------------------------------------------------------------------

describe("selectReviewerForProtocol", () => {
    afterEach(() => {
        jest.spyOn(Math, "random").mockRestore();
    });

    it("returns null when there are no eligible reviewers", async () => {
        mockDb.user.findMany.mockResolvedValue([]);
        mockDb.reviewAssignment.groupBy.mockResolvedValue([]);

        expect(await selectReviewerForProtocol()).toBeNull();
    });

    it("combines eligible reviewers and loads to pick the lowest-load reviewer", async () => {
        mockDb.user.findMany.mockResolvedValue([
            { id: "a1", name: "A", email: "a@x", role: "admin" },
            { id: "a2", name: "B", email: "b@x", role: "admin" },
        ]);
        mockDb.reviewAssignment.groupBy.mockResolvedValue([
            { reviewerId: "a1", _count: { _all: 4 } },
            { reviewerId: "a2", _count: { _all: 1 } },
        ]);
        jest.spyOn(Math, "random").mockReturnValue(0);

        const picked = await selectReviewerForProtocol();

        expect(picked?.id).toBe("a2");
    });

    it("passes excludeUserIds to getEligibleReviewers", async () => {
        mockDb.user.findMany.mockResolvedValue([]);
        mockDb.reviewAssignment.groupBy.mockResolvedValue([]);

        await selectReviewerForProtocol({ excludeUserIds: ["owner-1"] });

        expect(mockDb.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    id: { notIn: ["owner-1"] },
                }),
            })
        );
    });
});

// ---------------------------------------------------------------------------
// hasActiveAssignment
// ---------------------------------------------------------------------------

describe("hasActiveAssignment", () => {
    it("returns the first active assignment for the project", async () => {
        mockDb.reviewAssignment.findFirst.mockResolvedValue({
            id: "asg-1",
            reviewerId: "a1",
        });

        const result = await hasActiveAssignment("project-1");

        expect(result).toEqual({ id: "asg-1", reviewerId: "a1" });
        expect(mockDb.reviewAssignment.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    projectId: "project-1",
                    status: {
                        in: ACTIVE_ASSIGNMENT_STATUSES as unknown as ReviewAssignmentStatus[],
                    },
                },
                select: { id: true, reviewerId: true },
            })
        );
    });

    it("returns null when no active assignment exists", async () => {
        mockDb.reviewAssignment.findFirst.mockResolvedValue(null);
        expect(await hasActiveAssignment("project-1")).toBeNull();
    });

    it("uses the transaction client when passed", async () => {
        const tx = {
            reviewAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
        } as any;

        await hasActiveAssignment("project-1", tx);

        expect(tx.reviewAssignment.findFirst).toHaveBeenCalled();
        expect(mockDb.reviewAssignment.findFirst).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// getCurrentReviewer
// ---------------------------------------------------------------------------

describe("getCurrentReviewer", () => {
    it("returns the assignment with the reviewer included, ordered by createdAt desc", async () => {
        const row = {
            id: "asg-1",
            reviewerId: "a1",
            reviewer: { id: "a1", name: "A", email: "a@x", role: "admin" },
        };
        mockDb.reviewAssignment.findFirst.mockResolvedValue(row);

        const result = await getCurrentReviewer("project-1");

        expect(result).toBe(row);
        expect(mockDb.reviewAssignment.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    projectId: "project-1",
                    status: {
                        in: ACTIVE_ASSIGNMENT_STATUSES as unknown as ReviewAssignmentStatus[],
                    },
                },
                orderBy: { createdAt: "desc" },
            })
        );
    });

    it("uses the transaction client when passed", async () => {
        const tx = {
            reviewAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
        } as any;

        await getCurrentReviewer("project-1", tx);

        expect(tx.reviewAssignment.findFirst).toHaveBeenCalled();
        expect(mockDb.reviewAssignment.findFirst).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// isCurrentReviewer
// ---------------------------------------------------------------------------

describe("isCurrentReviewer", () => {
    it("returns true when the caller matches the current reviewer", async () => {
        mockDb.reviewAssignment.findFirst.mockResolvedValue({
            reviewerId: "a1",
            reviewer: { id: "a1", name: "A", email: "a@x", role: "admin" },
        });

        expect(await isCurrentReviewer("project-1", "a1")).toBe(true);
    });

    it("returns false when the caller is someone else", async () => {
        mockDb.reviewAssignment.findFirst.mockResolvedValue({
            reviewerId: "a1",
            reviewer: { id: "a1", name: "A", email: "a@x", role: "admin" },
        });

        expect(await isCurrentReviewer("project-1", "a2")).toBe(false);
    });

    it("returns false when no active assignment exists", async () => {
        mockDb.reviewAssignment.findFirst.mockResolvedValue(null);
        expect(await isCurrentReviewer("project-1", "a1")).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// autoReassignReviewer
// ---------------------------------------------------------------------------

describe("autoReassignReviewer", () => {
    const project = {
        id: "project-1",
        title: "Protocol",
        userId: "owner-1",
    };

    function buildTx() {
        const tx = {
            project: { findUnique: jest.fn().mockResolvedValue(project) },
            reviewAssignment: {
                findFirst: jest.fn(),
                findMany: jest.fn().mockResolvedValue([]),
                create: jest.fn().mockResolvedValue({}),
                update: jest.fn().mockResolvedValue({}),
            },
            user: { findMany: jest.fn().mockResolvedValue([]) },
            auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return tx;
    }

    afterEach(() => {
        jest.spyOn(Math, "random").mockRestore();
    });

    it("returns nulls when the project does not exist", async () => {
        const tx = buildTx();
        tx.project.findUnique.mockResolvedValue(null);

        const result = await autoReassignReviewer({
            projectId: "project-1",
            tx: tx as any,
        });

        expect(result).toEqual({
            assignedReviewer: null,
            previousReviewerId: null,
        });
        expect(tx.reviewAssignment.create).not.toHaveBeenCalled();
    });

    it("excludes the current assignment and creates a new PENDING_COI one", async () => {
        const tx = buildTx();
        tx.reviewAssignment.findFirst.mockResolvedValue({
            id: "asg-old",
            reviewerId: "old-reviewer",
        });
        tx.reviewAssignment.findMany.mockResolvedValue([
            { reviewerId: "old-reviewer" },
        ]);
        tx.user.findMany.mockResolvedValue([
            { id: "new-reviewer", name: "New", email: "new@x", role: "admin" },
        ]);
        // (getReviewerLoads for the new candidate hits groupBy on tx; but
        // getReviewerLoads uses client(tx).reviewAssignment.groupBy — the
        // helper falls back to global db.reviewAssignment when tx is passed
        // only if tx.reviewAssignment.groupBy is absent. Provide it.)
        (tx.reviewAssignment as any).groupBy = jest
            .fn()
            .mockResolvedValue([{ reviewerId: "new-reviewer", _count: { _all: 0 } }]);

        // getEligibleReviewers + getReviewerLoads both get the tx client.
        // Simpler: mock db.user.findMany for the fallback path? No — the
        // helper uses the tx because we pass tx. Make the tx the source.
        tx.user.findMany.mockResolvedValue([
            { id: "new-reviewer", name: "New", email: "new@x", role: "admin" },
        ]);

        jest.spyOn(Math, "random").mockReturnValue(0);

        const result = await autoReassignReviewer({
            projectId: "project-1",
            reason: "COI declared",
            actorUserId: "actor-1",
            tx: tx as any,
        });

        expect(tx.reviewAssignment.update).toHaveBeenCalledWith({
            where: { id: "asg-old" },
            data: { status: "EXCLUDED", reassignedAt: expect.any(Date) },
        });

        expect(tx.reviewAssignment.create).toHaveBeenCalledWith({
            data: {
                projectId: "project-1",
                reviewerId: "new-reviewer",
                status: "PENDING_COI",
                reassignedFromId: "old-reviewer",
            },
        });

        expect(result.assignedReviewer?.id).toBe("new-reviewer");
        expect(result.previousReviewerId).toBe("old-reviewer");
    });

    it("excludes the owner, previous reviewers, and extra excludeUserIds", async () => {
        const tx = buildTx();
        tx.reviewAssignment.findFirst.mockResolvedValue({
            id: "asg-old",
            reviewerId: "old-reviewer",
        });
        tx.reviewAssignment.findMany.mockResolvedValue([
            { reviewerId: "old-reviewer" },
            { reviewerId: "another-old" },
        ]);
        tx.user.findMany.mockResolvedValue([]);
        (tx.reviewAssignment as any).groupBy = jest.fn().mockResolvedValue([]);

        await autoReassignReviewer({
            projectId: "project-1",
            excludeUserIds: ["extra-1"],
            tx: tx as any,
        });

        const userCall = tx.user.findMany.mock.calls[0][0];
        const excluded = userCall.where.id.notIn as string[];
        expect(excluded).toEqual(
            expect.arrayContaining([
                "owner-1",
                "old-reviewer",
                "another-old",
                "extra-1",
            ])
        );
    });

    it("still marks the old assignment EXCLUDED when no replacement is available", async () => {
        const tx = buildTx();
        tx.reviewAssignment.findFirst.mockResolvedValue({
            id: "asg-old",
            reviewerId: "old-reviewer",
        });
        tx.user.findMany.mockResolvedValue([]);
        (tx.reviewAssignment as any).groupBy = jest.fn().mockResolvedValue([]);

        const result = await autoReassignReviewer({
            projectId: "project-1",
            tx: tx as any,
        });

        expect(tx.reviewAssignment.update).toHaveBeenCalledWith({
            where: { id: "asg-old" },
            data: { status: "EXCLUDED", reassignedAt: expect.any(Date) },
        });
        expect(tx.reviewAssignment.create).not.toHaveBeenCalled();
        expect(result).toEqual({
            assignedReviewer: null,
            previousReviewerId: "old-reviewer",
        });
    });

    it("does not write an audit log when no actorUserId is provided", async () => {
        const tx = buildTx();
        tx.reviewAssignment.findFirst.mockResolvedValue(null);
        tx.user.findMany.mockResolvedValue([
            { id: "new-reviewer", name: "New", email: "new@x", role: "admin" },
        ]);
        (tx.reviewAssignment as any).groupBy = jest.fn().mockResolvedValue([]);
        jest.spyOn(Math, "random").mockReturnValue(0);

        await autoReassignReviewer({
            projectId: "project-1",
            tx: tx as any,
        });

        expect(tx.auditLog.create).not.toHaveBeenCalled();
    });

    it("writes a single audit log with the reason when actorUserId is provided", async () => {
        const tx = buildTx();
        tx.reviewAssignment.findFirst.mockResolvedValue(null);
        tx.user.findMany.mockResolvedValue([
            { id: "new-reviewer", name: "New", email: "new@x", role: "admin" },
        ]);
        (tx.reviewAssignment as any).groupBy = jest.fn().mockResolvedValue([]);
        jest.spyOn(Math, "random").mockReturnValue(0);

        await autoReassignReviewer({
            projectId: "project-1",
            reason: "Reviewer was banned",
            actorUserId: "actor-1",
            tx: tx as any,
        });

        expect(tx.auditLog.create).toHaveBeenCalledWith({
            data: {
                action: "AUTO_REASSIGN_REVIEWER",
                details: expect.stringContaining("Reviewer was banned"),
                targetId: "project-1",
                userId: "actor-1",
            },
        });
    });

    it("handles the case where there is no existing active assignment (previousReviewerId null)", async () => {
        const tx = buildTx();
        tx.reviewAssignment.findFirst.mockResolvedValue(null);
        tx.reviewAssignment.findMany.mockResolvedValue([]);
        tx.user.findMany.mockResolvedValue([
            { id: "new-reviewer", name: "New", email: "new@x", role: "admin" },
        ]);
        (tx.reviewAssignment as any).groupBy = jest.fn().mockResolvedValue([]);
        jest.spyOn(Math, "random").mockReturnValue(0);

        const result = await autoReassignReviewer({
            projectId: "project-1",
            actorUserId: "actor-1",
            tx: tx as any,
        });

        expect(tx.reviewAssignment.update).not.toHaveBeenCalled();
        expect(tx.reviewAssignment.create).toHaveBeenCalledWith({
            data: {
                projectId: "project-1",
                reviewerId: "new-reviewer",
                status: "PENDING_COI",
                reassignedFromId: null,
            },
        });
        expect(result.previousReviewerId).toBeNull();
    });
});
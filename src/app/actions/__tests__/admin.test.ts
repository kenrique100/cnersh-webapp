/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@/lib/auth-utils", () => ({
    verifiedAuthSession: jest.fn(),
}));

jest.mock("@/lib/permissions", () => {
    const levels: Record<string, number> = { user: 0, admin: 1, superadmin: 2 };
    return {
        isRoleName: (role: unknown) => typeof role === "string" && role in levels,
        isAdminRole: (role: unknown) =>
            role === "admin" || role === "superadmin",
        canManageRole: (actor: string, target: string) =>
            (levels[actor] ?? -1) > (levels[target] ?? 99),
        canAssignRole: (actor: string, target: string) =>
            actor === "superadmin" || (actor === "admin" && target === "user"),
    };
});

jest.mock("@/lib/reviewer-assignment", () => ({
    autoReassignReviewer: jest
        .fn()
        .mockResolvedValue({ assignedReviewer: null, previousReviewerId: null }),
}));

jest.mock("@/lib/db", () => {
    const mockDb = {
        $transaction: jest.fn(),
        user: {
            count: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        auditLog: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
        post: { count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        project: { count: jest.fn() },
        communityTopic: {
            count: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        communityReply: {
            count: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        comment: {
            count: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        report: {
            count: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        notification: { create: jest.fn() },
        session: { deleteMany: jest.fn() },
        reviewAssignment: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
        },
    };
    mockDb.$transaction = jest.fn(
        async (callback: (tx: typeof mockDb) => unknown) => callback(mockDb)
    );
    return { db: mockDb };
});

jest.mock("@/lib/notify-admins", () => ({
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
}));

import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";
import { autoReassignReviewer } from "@/lib/reviewer-assignment";

import {
    getUserManagementData,
    getAdminStats,
    getAuditLogs,
    getReports,
    createReport,
    resolveReport,
    sendWarning,
    banUserById,
    unbanUserById,
    activateUser,
    deleteReportedContent,
    applyRoleChange,
    removeManagedUser,
    updateManagedUser,
} from "@/app/actions/admin";

const mockVerifiedAuthSession = verifiedAuthSession as jest.Mock;
const mockNotifyAdmins = notifyAdmins as jest.Mock;
const mockAutoReassign = autoReassignReviewer as jest.Mock;

const mockDb = db as unknown as {
    $transaction: jest.Mock;
    user: {
        count: jest.Mock;
        findUnique: jest.Mock;
        findMany: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
    };
    auditLog: { findMany: jest.Mock; count: jest.Mock; create: jest.Mock };
    post: { count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    project: { count: jest.Mock };
    communityTopic: {
        count: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
    };
    communityReply: {
        count: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
    };
    comment: {
        count: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
    };
    report: {
        count: jest.Mock;
        findMany: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
    };
    notification: { create: jest.Mock };
    session: { deleteMany: jest.Mock };
    reviewAssignment: { findMany: jest.Mock; findFirst: jest.Mock };
};

function mockSession(
    userId = "admin-1",
    name = "Admin User",
    role = "admin"
): void {
    mockVerifiedAuthSession.mockResolvedValue({
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, "")}@test.com`,
            emailVerified: true,
            role,
            banned: false,
            banReason: null,
            banExpires: null,
        },
    });
}

function mockAdmin(role: "admin" | "superadmin" = "admin"): void {
    mockSession("admin-1", "Admin User", role);
    mockDb.user.findUnique.mockResolvedValue({ role });
}

beforeEach(() => {
    jest.clearAllMocks();

    // Re-install the transaction runner after clearAllMocks.
    mockDb.$transaction = jest.fn(
        async (callback: (tx: typeof mockDb) => unknown) => callback(mockDb)
    );

    mockDb.user.count.mockResolvedValue(0);
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.findMany.mockResolvedValue([]);
    mockDb.user.update.mockResolvedValue({});
    mockDb.user.delete.mockResolvedValue({});

    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);
    mockDb.auditLog.create.mockResolvedValue({});

    mockDb.post.count.mockResolvedValue(0);
    mockDb.communityTopic.count.mockResolvedValue(0);
    mockDb.communityReply.count.mockResolvedValue(0);
    mockDb.comment.count.mockResolvedValue(0);
    mockDb.report.count.mockResolvedValue(0);
    mockDb.report.findMany.mockResolvedValue([]);
    mockDb.project.count.mockResolvedValue(0);

    mockDb.notification.create.mockResolvedValue({});
    mockDb.session.deleteMany.mockResolvedValue({});

    mockDb.reviewAssignment.findMany.mockResolvedValue([]);
    mockDb.reviewAssignment.findFirst.mockResolvedValue(null);

    mockNotifyAdmins.mockResolvedValue(undefined);
    mockAutoReassign.mockResolvedValue({
        assignedReviewer: null,
        previousReviewerId: null,
    });
});

// ── getUserManagementData ─────────────────────────────────────────────

describe("getUserManagementData", () => {
    it("throws Unauthorized if not authenticated", async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(getUserManagementData()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden for non-admin", async () => {
        mockSession("user-1", "Regular User", "user");
        mockDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(getUserManagementData()).rejects.toThrow("Forbidden");
    });

    it("returns stats and users for admin", async () => {
        mockAdmin("admin");

        mockDb.user.count.mockResolvedValue(100);
        mockDb.user.findMany.mockResolvedValue([
            { id: "u1", name: "User1", role: "user", banned: false },
        ]);
        mockDb.auditLog.findMany.mockResolvedValue([
            {
                id: "a1",
                action: "LOGIN",
                details: "...",
                targetId: null,
                createdAt: new Date(),
                user: { name: "Admin", email: "admin@test.com" },
            },
        ]);

        const data = await getUserManagementData();

        expect(data.stats.totalUsers).toBe(100);
        expect(data.recentActivity).toHaveLength(1);
        expect(data.users).toHaveLength(1);
    });

    it("returns all roles for superadmin", async () => {
        mockAdmin("superadmin");

        mockDb.user.count.mockResolvedValue(50);
        mockDb.user.findMany.mockResolvedValue([
            { id: "u1", name: "Admin", role: "admin", banned: false },
            { id: "u2", name: "User", role: "user", banned: false },
        ]);
        mockDb.auditLog.findMany.mockResolvedValue([]);

        const data = await getUserManagementData();
        expect(data.users).toHaveLength(2);
    });
});

// ── getAdminStats ─────────────────────────────────────────────────────

describe("getAdminStats", () => {
    it("throws Unauthorized if not authenticated", async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(getAdminStats()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden for regular users", async () => {
        mockSession("user-1", "Regular", "user");
        mockDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(getAdminStats()).rejects.toThrow("Forbidden");
    });

    it("returns aggregated stats for admin", async () => {
        mockAdmin("admin");

        mockDb.user.count.mockResolvedValue(10);
        mockDb.post.count.mockResolvedValue(5);
        mockDb.project.count.mockResolvedValue(4);
        mockDb.communityTopic.count.mockResolvedValue(3);
        mockDb.report.count.mockResolvedValue(2);

        const stats = await getAdminStats();

        expect(stats.totalUsers).toBe(10);
        expect(stats.totalPosts).toBe(5);
        expect(stats.pendingReports).toBe(2);
        expect(stats.activeUsers).toBe(0);
    });
});

// ── getAuditLogs ──────────────────────────────────────────────────────

describe("getAuditLogs", () => {
    it("throws Unauthorized if not authenticated", async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(getAuditLogs()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden for regular users", async () => {
        mockSession("user-1", "Regular", "user");
        mockDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(getAuditLogs()).rejects.toThrow("Forbidden");
    });

    it("returns paginated audit logs for admin", async () => {
        mockAdmin("admin");

        mockDb.auditLog.findMany.mockResolvedValue([
            {
                id: "l1",
                action: "LOGIN",
                user: { id: "u1", name: "Admin", email: "a@test.com" },
            },
        ]);
        mockDb.auditLog.count.mockResolvedValue(1);

        const result = await getAuditLogs(1, 10);

        expect(result.logs).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.pages).toBe(1);
    });

    it("calculates pages correctly", async () => {
        mockAdmin("admin");

        mockDb.auditLog.findMany.mockResolvedValue([]);
        mockDb.auditLog.count.mockResolvedValue(25);

        const result = await getAuditLogs(1, 10);
        expect(result.pages).toBe(3);
    });
});

// ── getReports ────────────────────────────────────────────────────────

describe("getReports", () => {
    it("throws Unauthorized if not authenticated", async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(getReports()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden for regular users", async () => {
        mockSession("user-1", "Regular", "user");
        mockDb.user.findUnique.mockResolvedValue({ role: "user" });

        await expect(getReports()).rejects.toThrow("Forbidden");
    });

    it("returns paginated reports for admin", async () => {
        mockAdmin("admin");

        mockDb.report.findMany.mockResolvedValue([
            { id: "r1", reason: "Spam", user: { id: "u1", name: "Reporter" } },
        ]);
        mockDb.report.count.mockResolvedValue(1);

        const result = await getReports();

        expect(result.reports).toHaveLength(1);
        expect(result.total).toBe(1);
    });
});

// ── createReport ──────────────────────────────────────────────────────

describe("createReport", () => {
    it("throws Unauthorized if not authenticated", async () => {
        mockVerifiedAuthSession.mockRejectedValue(new Error("Unauthorized"));
        await expect(
            createReport({ contentType: "POST", contentId: "p1", reason: "Spam" })
        ).rejects.toThrow("Unauthorized");
    });

    it("creates a report and notifies admins", async () => {
        mockSession("user-1", "Reporter", "user");
        mockDb.report.create.mockResolvedValue({
            id: "r1",
            reason: "Spam",
            contentType: "POST",
            contentId: "p1",
        });

        const result = await createReport({
            contentType: "POST",
            contentId: "p1",
            reason: "Spam",
        });

        expect(result).toHaveProperty("id", "r1");
        expect(mockNotifyAdmins).toHaveBeenCalledWith(
            expect.objectContaining({ type: "SYSTEM" })
        );
    });
});

// ── resolveReport ─────────────────────────────────────────────────────

describe("resolveReport", () => {
    it("resolves a report and writes an audit log", async () => {
        mockAdmin("admin");

        mockDb.report.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await resolveReport("r1", "REVIEWED");

        expect(result.success).toBe(true);
        expect(mockDb.report.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "r1" },
                data: { status: "REVIEWED" },
            })
        );
        expect(mockDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: "RESOLVE_REPORT" }),
            })
        );
    });
});

// ── banUserById ───────────────────────────────────────────────────────

describe("banUserById", () => {
    it("admin can ban a regular user", async () => {
        mockAdmin("admin");

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: "admin" }) // requireAdmin
            .mockResolvedValueOnce({ role: "admin" }) // acting user
            .mockResolvedValueOnce({ role: "user" }); // target

        mockDb.user.update.mockResolvedValue({});
        mockDb.session.deleteMany.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await banUserById("user-2", "Spam");

        expect(result.success).toBe(true);
        expect(mockDb.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "user-2" },
                data: { banned: true, banReason: "Spam" },
            })
        );
        // Regular user target → no reassignment.
        expect(mockAutoReassign).not.toHaveBeenCalled();
    });

    it("superadmin banning another admin triggers reassignment of their active protocols", async () => {
        mockAdmin("superadmin");

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: "superadmin" }) // requireAdmin
            .mockResolvedValueOnce({ role: "superadmin" }) // acting user
            .mockResolvedValueOnce({ role: "admin" }); // target

        mockDb.user.update.mockResolvedValue({});
        mockDb.session.deleteMany.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        mockDb.reviewAssignment.findMany.mockResolvedValue([
            { projectId: "project-A" },
            { projectId: "project-B" },
        ]);

        await banUserById("admin-2", "Misconduct");

        expect(mockDb.reviewAssignment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    reviewerId: "admin-2",
                    status: { in: ["PENDING_COI", "ACTIVE"] },
                },
            })
        );
        expect(mockAutoReassign).toHaveBeenCalledTimes(2);
        expect(mockAutoReassign).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId: "project-A",
                reason: "Reviewer was banned",
            })
        );
    });
});

// ── applyRoleChange (demotion triggers reassignment) ──────────────────

describe("applyRoleChange", () => {
    it("demoting an admin to user triggers reassignment of active protocols", async () => {
        mockAdmin("superadmin");

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: "superadmin" }) // requireAdmin
            .mockResolvedValueOnce({ role: "superadmin" }) // acting
            .mockResolvedValueOnce({
                name: "Ex-Admin",
                email: "x@test.com",
                role: "admin",
            }); // target

        mockDb.user.update.mockResolvedValue({});
        mockDb.session.deleteMany.mockResolvedValue({});
        mockDb.notification.create.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        mockDb.reviewAssignment.findMany.mockResolvedValue([
            { projectId: "project-A" },
        ]);

        await applyRoleChange("admin-2", "admin", "user");

        expect(mockAutoReassign).toHaveBeenCalledTimes(1);
        expect(mockAutoReassign).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId: "project-A",
                reason: "Reviewer was demoted to user",
            })
        );
    });

    it("promotion does not trigger reassignment", async () => {
        mockAdmin("superadmin");

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: "superadmin" })
            .mockResolvedValueOnce({ role: "superadmin" })
            .mockResolvedValueOnce({
                name: "User",
                email: "u@test.com",
                role: "user",
            });

        mockDb.user.update.mockResolvedValue({});
        mockDb.session.deleteMany.mockResolvedValue({});
        mockDb.notification.create.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        await applyRoleChange("user-2", "user", "admin");

        expect(mockAutoReassign).not.toHaveBeenCalled();
    });
});

// ── removeManagedUser (triggers reassignment for admins) ──────────────

describe("removeManagedUser", () => {
    it("removing an admin reassigns their active protocols", async () => {
        mockAdmin("superadmin");

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: "superadmin" }) // requireAdmin
            .mockResolvedValueOnce({ role: "superadmin" }) // acting
            .mockResolvedValueOnce({ role: "admin" }); // target

        mockDb.reviewAssignment.findMany.mockResolvedValue([
            { projectId: "project-A" },
        ]);
        mockDb.user.delete.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        await removeManagedUser("admin-2");

        expect(mockDb.user.delete).toHaveBeenCalledWith({
            where: { id: "admin-2" },
        });
        expect(mockAutoReassign).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId: "project-A",
                reason: "Reviewer was removed",
            })
        );
    });
});

// ── activateUser / unbanUserById / deleteReportedContent ──────────────

describe("unbanUserById", () => {
    it("unbans user and writes audit log", async () => {
        mockAdmin("admin");

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: "admin" })
            .mockResolvedValueOnce({ role: "admin" })
            .mockResolvedValueOnce({
                name: "Banned",
                email: "b@test.com",
                role: "user",
            });

        mockDb.user.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await unbanUserById("user-2");

        expect(result.success).toBe(true);
        expect(mockDb.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "user-2" },
                data: { banned: false, banReason: null, banExpires: null },
            })
        );
    });
});

describe("activateUser", () => {
    it("superadmin activates a pending user", async () => {
        mockAdmin("superadmin");

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: "superadmin" })
            .mockResolvedValueOnce({ role: "superadmin" });

        mockDb.user.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await activateUser("user-1");

        expect(result.success).toBe(true);
        expect(mockDb.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "user-1" },
                data: { pendingActivation: false, activationExpiresAt: null },
            })
        );
    });
});

describe("deleteReportedContent", () => {
    it("soft-deletes a POST", async () => {
        mockAdmin("superadmin");

        mockDb.user.findUnique
            .mockResolvedValueOnce({ role: "superadmin" })
            .mockResolvedValueOnce({ role: "superadmin" });

        mockDb.post.findUnique.mockResolvedValue({
            deleted: false,
            user: { role: "user" },
        });
        mockDb.post.update.mockResolvedValue({});
        mockDb.auditLog.create.mockResolvedValue({});

        const result = await deleteReportedContent("POST", "p1");

        expect(result.success).toBe(true);
        expect(mockDb.post.update).toHaveBeenCalledWith({
            where: { id: "p1" },
            data: { deleted: true },
        });
    });
});
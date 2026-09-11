jest.mock("@/lib/auth-utils", () => ({ authSession: jest.fn() }));
jest.mock("@/lib/permissions", () => {
    const levels: Record<string, number> = { user: 0, admin: 1, superadmin: 2 };
    return {
        isRoleName: (role: unknown) => typeof role === "string" && role in levels,
        isAdminRole: (role: unknown) => role === "admin" || role === "superadmin",
        canManageRole: (actor: string, target: string) => (levels[actor] ?? -1) > (levels[target] ?? 99),
        canAssignRole: (actor: string, target: string) => actor === "superadmin" || (actor === "admin" && target === "user"),
    };
});
jest.mock("@/lib/db", () => ({
    db: {
        user: { findUnique: jest.fn(), delete: jest.fn(), update: jest.fn() },
        auditLog: { create: jest.fn() },
        session: { deleteMany: jest.fn() },
    },
}));
jest.mock("@/lib/notify-admins", () => ({ notifyAdmins: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/erasure/deletion-service", () => ({ requestAccountDeletion: jest.fn() }));

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { requestAccountDeletion } from "@/lib/erasure/deletion-service";
import { removeManagedUser } from "@/app/actions/admin";

const mockedAuthSession = jest.mocked(authSession);
const mockedFindUnique = db.user.findUnique as jest.Mock;
const mockedRequest = jest.mocked(requestAccountDeletion);

const adminSession = { user: { id: "admin-1", role: "admin" } } as unknown as Awaited<ReturnType<typeof authSession>>;

/** requireAdmin looks the actor up first, then removeManagedUser looks up actor and target. */
function arrangeRoles(actorRole: string, targetRole: string) {
    mockedFindUnique
        .mockResolvedValueOnce({ role: actorRole })
        .mockResolvedValueOnce({ role: actorRole })
        .mockResolvedValueOnce({ role: targetRole });
}

describe("removeManagedUser", () => {
    beforeEach(() => jest.clearAllMocks());

    it("routes admin removals through the erasure service instead of a hard delete", async () => {
        mockedAuthSession.mockResolvedValue(adminSession);
        arrangeRoles("admin", "user");
        mockedRequest.mockResolvedValueOnce({ requestId: "req-1", status: "COMPLETED", completedSteps: [], lastError: null });

        const result = await removeManagedUser("user-9");

        expect(result).toEqual({ success: true, status: "COMPLETED", requestId: "req-1" });
        expect(mockedRequest).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "user-9", actorId: "admin-1", via: "ADMIN" })
        );
        expect(db.user.delete).not.toHaveBeenCalled();
    });

    it("keeps the role hierarchy: an admin cannot remove another admin", async () => {
        mockedAuthSession.mockResolvedValue(adminSession);
        arrangeRoles("admin", "admin");
        await expect(removeManagedUser("admin-2")).rejects.toThrow("Forbidden");
        expect(mockedRequest).not.toHaveBeenCalled();
    });

    it("refuses self-removal through the admin path", async () => {
        mockedAuthSession.mockResolvedValue(adminSession);
        mockedFindUnique.mockResolvedValueOnce({ role: "admin" });
        await expect(removeManagedUser("admin-1")).rejects.toThrow("Forbidden");
        expect(mockedRequest).not.toHaveBeenCalled();
    });

    it("rejects anonymous callers", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(removeManagedUser("user-9")).rejects.toThrow("Unauthorized");
        expect(mockedRequest).not.toHaveBeenCalled();
    });
});

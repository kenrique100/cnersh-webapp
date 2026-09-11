import { submitCOIDeclaration, getMyReviewAssignments } from "@/app/actions/coi";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify-admins";

jest.mock("@/lib/db", () => ({
    db: {
        reviewAssignment: {
            findUnique: jest.fn(),
            updateMany: jest.fn(),
            findMany: jest.fn(),
        },
        cOIDeclaration: {
            create: jest.fn(),
        },
        project: {
            updateMany: jest.fn(),
        },
        projectStatusHistory: {
            create: jest.fn(),
        },
        auditLog: {
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock("@/lib/auth-utils", () => ({
    authSession: jest.fn(),
}));
jest.mock("@/lib/notify-admins", () => ({
    notifyAdmins: jest.fn(),
}));

// 1. Define the explicit shape of your mock database
type MockDb = {
    reviewAssignment: {
        findUnique: jest.Mock;
        updateMany: jest.Mock;
        findMany: jest.Mock;
    };
    cOIDeclaration: {
        create: jest.Mock;
    };
    project: {
        updateMany: jest.Mock;
    };
    projectStatusHistory: {
        create: jest.Mock;
    };
    auditLog: {
        create: jest.Mock;
    };
    $transaction: jest.Mock;
};

const mockSession = { user: { id: "user-1" } };

// 2. Cast the imported modules to your mock types (resolves ESLint 'any' rule)
const mockDb = db as unknown as MockDb;
const mockAuthSession = authSession as jest.Mock;
const mockNotifyAdmins = notifyAdmins as jest.Mock;

describe("COI actions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // 3. Clean usage without needing inline 'as jest.Mock' casting
        mockAuthSession.mockResolvedValue(mockSession);
        mockNotifyAdmins.mockResolvedValue(undefined);
        mockDb.$transaction.mockImplementation(async (callback: (tx: MockDb) => unknown) => callback(mockDb));
        mockDb.reviewAssignment.updateMany.mockResolvedValue({ count: 1 });
        mockDb.project.updateMany.mockResolvedValue({ count: 0 });
    });

    describe("submitCOIDeclaration", () => {
        const input = {
            assignmentId: "assign-1",
            hasCOI: false,
            details: "Some details",
        };

        it("throws if not authenticated", async () => {
            mockAuthSession.mockResolvedValue(null);
            await expect(submitCOIDeclaration(input)).rejects.toThrow("Unauthorized");
        });

        it("throws if assignment not found", async () => {
            mockDb.reviewAssignment.findUnique.mockResolvedValue(null);
            await expect(submitCOIDeclaration(input)).rejects.toThrow("Review assignment not found");
        });

        it("throws if reviewer mismatch", async () => {
            const assignment = {
                id: "assign-1",
                reviewerId: "other-user",
                status: "PENDING_COI",
                project: { id: "proj-1", title: "Test", deleted: false, status: "PENDING_REVIEW" },
                coiDeclaration: null,
            };
            mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment);
            await expect(submitCOIDeclaration(input)).rejects.toThrow(
                "Forbidden: You can only submit your own COI declaration"
            );
        });

        it("throws if COI already declared", async () => {
            const assignment = {
                id: "assign-1",
                reviewerId: "user-1",
                status: "PENDING_COI",
                project: { id: "proj-1", title: "Test", deleted: false, status: "PENDING_REVIEW" },
                coiDeclaration: { id: "coi-1" },
            };
            mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment);
            await expect(submitCOIDeclaration(input)).rejects.toThrow(
                "COI declaration has already been submitted and cannot be changed"
            );
        });

        it("handles NO COI (hasCOI=false)", async () => {
            const assignment = {
                id: "assign-1",
                reviewerId: "user-1",
                status: "PENDING_COI",
                project: { id: "proj-1", title: "Test", deleted: false, status: "PENDING_REVIEW" },
                coiDeclaration: null,
            };
            mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment);
            const declaration = { id: "decl-1", hasCOI: false, declaredAt: new Date() };
            mockDb.cOIDeclaration.create.mockResolvedValue(declaration);
            const result = await submitCOIDeclaration({ ...input, hasCOI: false, details: undefined });

            expect(mockDb.cOIDeclaration.create).toHaveBeenCalledWith({
                data: {
                    assignmentId: "assign-1",
                    userId: "user-1",
                    hasCOI: false,
                    details: null,
                },
            });
            expect(mockDb.reviewAssignment.updateMany).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    id: "assign-1",
                    reviewerId: "user-1",
                    status: "PENDING_COI",
                }),
                data: { status: "ACTIVE" },
            });
            expect(mockDb.auditLog.create).toHaveBeenCalled();
            expect(mockNotifyAdmins).not.toHaveBeenCalled();
            expect(result).toEqual({
                id: "decl-1",
                hasCOI: false,
                declaredAt: declaration.declaredAt.toISOString(),
            });
        });

        it("handles COI (hasCOI=true) – notifies admins", async () => {
            const assignment = {
                id: "assign-1",
                reviewerId: "user-1",
                status: "PENDING_COI",
                project: { id: "proj-1", title: "Test", deleted: false, status: "PENDING_REVIEW" },
                coiDeclaration: null,
            };
            mockDb.reviewAssignment.findUnique.mockResolvedValue(assignment);
            const declaration = { id: "decl-1", hasCOI: true, declaredAt: new Date() };
            mockDb.cOIDeclaration.create.mockResolvedValue(declaration);
            await submitCOIDeclaration({ ...input, hasCOI: true, details: "Conflict" });

            expect(mockDb.reviewAssignment.updateMany).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    id: "assign-1",
                    reviewerId: "user-1",
                    status: "PENDING_COI",
                }),
                data: { status: "EXCLUDED" },
            });
            expect(mockNotifyAdmins).toHaveBeenCalledWith({
                type: "SYSTEM",
                message: expect.stringContaining("declared a conflict of interest"),
                link: "/admin/protocol-review",
                excludeUserId: "user-1",
            });
            expect(mockDb.auditLog.create).toHaveBeenCalledWith({
                data: {
                    action: "COI_DECLARED",
                    details: expect.stringContaining("COI"),
                    targetId: "proj-1",
                    userId: "user-1",
                },
            });
        });
    });

    describe("getMyReviewAssignments", () => {
        it("throws if not authenticated", async () => {
            mockAuthSession.mockResolvedValue(null);
            await expect(getMyReviewAssignments()).rejects.toThrow("Unauthorized");
        });

        it("returns assignments for the current user", async () => {
            const mockAssignments = [{ id: "a1" }, { id: "a2" }];
            mockDb.reviewAssignment.findMany.mockResolvedValue(mockAssignments);

            const result = await getMyReviewAssignments();

            expect(mockDb.reviewAssignment.findMany).toHaveBeenCalledWith({
                where: { reviewerId: "user-1", project: { deleted: false } },
                include: {
                    project: {
                        select: {
                            id: true,
                            title: true,
                            category: true,
                            status: true,
                            trackingCode: true,
                            createdAt: true,
                        },
                    },
                    coiDeclaration: true,
                    evaluationReport: { select: { id: true, status: true, recommendation: true, submittedAt: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            expect(result).toEqual(mockAssignments);
        });
    });
});

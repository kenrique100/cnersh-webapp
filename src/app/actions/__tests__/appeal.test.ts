import { fileAppeal, resolveAppeal, getProjectAppeal, getPendingAppeals } from "@/app/actions/appeal";

/**
 * Keep these jest. Mock calls at top so Jest hoists them before imports.
 * They provide the mocked modules used by the action functions.
 */
jest.mock("@/lib/auth-utils", () => ({
    authSession: jest.fn(),
}));
jest.mock("@/lib/notify-admins", () => ({
    notifyAdmins: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
    db: {
        project: {},
        appeal: {},
        auditLog: {},
        user: {},
        notification: {},
        $transaction: jest.fn(),
    },
}));

import { authSession } from "@/lib/auth-utils";
import { notifyAdmins } from "@/lib/notify-admins";
import { db } from "@/lib/db";

/**
 * Small test-only typing for the authSession return shape used in the code under test.
 * Keeps us from using `any` in mock typings.
 */
type TestAuthSession = {
    session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress: string | null;
        userAgent: string | null;
        impersonatedBy: string | null;
    };
    user: {
        id: string;
        name: string | null;
        email: string | null;
        emailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        image: string | null;
        role: string;
        banned: boolean;
        banReason: string | null;
        banExpires: Date | null;
        welcomeEmailSent: boolean;
        gender?: string | null;
        profession?: string | null;
        title?: string | null;
    };
} | null;

/**
 * Typed mocks (use unknown generics rather than `any` to satisfy ESLint).
 */
const mockedAuthSession = authSession as unknown as jest.MockedFunction<() => Promise<TestAuthSession>>;
const mockedNotifyAdmins = notifyAdmins as unknown as jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const mockedDb = db as unknown as {
    project: Record<string, jest.Mock<unknown, unknown[]>>;
    appeal: Record<string, jest.Mock<unknown, unknown[]>>;
    auditLog: Record<string, jest.Mock<unknown, unknown[]>>;
    user: Record<string, jest.Mock<unknown, unknown[]>>;
    notification: Record<string, jest.Mock<unknown, unknown[]>>;
    $transaction: jest.Mock<unknown, unknown[]>;
};

/** helper to mock an authenticated session */
function mockSession(userId: string, role = "user") {
    const sessionObject: TestAuthSession = {
        session: {
            id: "session-id",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId,
            expiresAt: new Date(Date.now() + 86400000),
            token: "token",
            ipAddress: null,
            userAgent: null,
            impersonatedBy: null,
        },
        user: {
            id: userId,
            name: "Test User",
            email: "user@test.com",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            image: null,
            role,
            banned: false,
            banReason: null,
            banExpires: null,
            welcomeEmailSent: false,
            gender: "male",
            profession: null,
            title: null,
        },
    };

    mockedAuthSession.mockResolvedValue(sessionObject);
}

beforeEach(() => {
    jest.clearAllMocks();

    // ensure our mocked db tables exist and are fresh objects
    mockedDb.project = {};
    mockedDb.appeal = {};
    mockedDb.auditLog = {};
    mockedDb.user = {};
    mockedDb.notification = {};
    mockedDb.$transaction = jest.fn();
});

describe("fileAppeal", () => {
    const APPEAL_WINDOW_DAYS = 30;
    const PRESIDENT_RESPONSE_DAYS = 45;

    beforeEach(() => {
        jest.clearAllMocks();
        mockedNotifyAdmins.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("throws Unauthorized if not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(fileAppeal({ projectId: "proj-1", grounds: "Some grounds" })).rejects.toThrow("Unauthorized");
    });

    it("throws Protocol not found when project does not exist", async () => {
        mockSession("user-1");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        await expect(fileAppeal({ projectId: "proj-1", grounds: "Some grounds" })).rejects.toThrow("Protocol not found");
    });

    it("throws Forbidden if caller is not the PI (project owner)", async () => {
        const now = new Date("2024-01-31T00:00:00.000Z");
        jest.useFakeTimers().setSystemTime(now);

        const project = {
            id: "proj-1",
            title: "Protocol title",
            userId: "owner-1",
            status: "RESUBMIT",
            appeal: null,
            statusHistory: [{ createdAt: new Date("2024-01-10T00:00:00.000Z") }],
        };

        mockSession("not-owner");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(project);

        await expect(fileAppeal({ projectId: "proj-1", grounds: "Grounds" })).rejects.toThrow(
            "Forbidden: Only the PI can file an appeal"
        );
    });

    it("throws if protocol is not rejected (status !== RESUBMIT)", async () => {
        const now = new Date("2024-01-31T00:00:00.000Z");
        jest.useFakeTimers().setSystemTime(now);

        mockSession("owner-1");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: "proj-1",
            title: "Protocol title",
            userId: "owner-1",
            status: "APPROVED",
            appeal: null,
            statusHistory: [{ createdAt: new Date("2024-01-01T00:00:00.000Z") }],
        });

        await expect(fileAppeal({ projectId: "proj-1", grounds: "Grounds" })).rejects.toThrow(
            "Appeals can only be filed against rejected protocols"
        );
    });

    it("throws if an appeal already exists", async () => {
        mockSession("owner-1");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: "proj-1",
            title: "Protocol title",
            userId: "owner-1",
            status: "RESUBMIT",
            appeal: { id: "appeal-1" },
            statusHistory: [{ createdAt: new Date("2024-01-10T00:00:00.000Z") }],
        });

        await expect(fileAppeal({ projectId: "proj-1", grounds: "Grounds" })).rejects.toThrow(
            "An appeal has already been filed for this protocol"
        );
    });

    it("throws if rejection date is missing from statusHistory", async () => {
        mockSession("owner-1");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: "proj-1",
            title: "Protocol title",
            userId: "owner-1",
            status: "RESUBMIT",
            appeal: null,
            statusHistory: [],
        });

        await expect(fileAppeal({ projectId: "proj-1", grounds: "Grounds" })).rejects.toThrow("Rejection date not found");
    });

    it("throws if appeal window is expired", async () => {
        const now = new Date("2024-02-01T00:00:00.000Z"); // > 30 days since 2024-01-01
        jest.useFakeTimers().setSystemTime(now);

        mockSession("owner-1");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: "proj-1",
            title: "Protocol title",
            userId: "owner-1",
            status: "RESUBMIT",
            appeal: null,
            statusHistory: [{ createdAt: new Date("2024-01-01T00:00:00.000Z") }],
        });

        await expect(fileAppeal({ projectId: "proj-1", grounds: "Grounds" })).rejects.toThrow(
            `The appeal window of ${APPEAL_WINDOW_DAYS} days has expired`
        );
    });

    it("throws if appeal grounds are empty", async () => {
        const now = new Date("2024-01-31T00:00:00.000Z");
        jest.useFakeTimers().setSystemTime(now);

        mockSession("owner-1");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: "proj-1",
            title: "Protocol title",
            userId: "owner-1",
            status: "RESUBMIT",
            appeal: null,
            statusHistory: [{ createdAt: new Date("2024-01-10T00:00:00.000Z") }],
        });

        await expect(fileAppeal({ projectId: "proj-1", grounds: "   " })).rejects.toThrow("Appeal grounds are required");
    });

    it("creates the appeal, updates project, writes audit log, notifies admins", async () => {
        const now = new Date("2024-01-31T00:00:00.000Z");
        jest.useFakeTimers().setSystemTime(now);

        const expectedDeadlineAt = new Date(now.getTime() + PRESIDENT_RESPONSE_DAYS * 24 * 60 * 60 * 1000);

        const rejectionDate = new Date("2024-01-15T00:00:00.000Z"); // within 30 days
        const project = {
            id: "proj-1",
            title: "Protocol title",
            userId: "owner-1",
            status: "RESUBMIT",
            appeal: null,
            statusHistory: [{ createdAt: rejectionDate }],
        };

        mockSession("owner-1");

        const createdAppeal = {
            id: "appeal-1",
            deadlineAt: expectedDeadlineAt,
            filedAt: new Date("2024-01-31T10:00:00.000Z"),
        };

        mockedDb.project.findUnique = jest.fn().mockResolvedValue(project);
        mockedDb.appeal.create = jest.fn().mockResolvedValue(createdAppeal);
        mockedDb.project.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});

        const result = await fileAppeal({
            projectId: "proj-1",
            grounds: "Because the board misinterpreted data.",
            evidence: "Evidence text",
        });

        expect(result.id).toBe("appeal-1");
        expect(result.deadlineAt).toBe(expectedDeadlineAt.toISOString());
        expect(result.filedAt).toBe(createdAppeal.filedAt.toISOString());

        expect(mockedDb.appeal.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    projectId: "proj-1",
                    appellantId: "owner-1",
                    grounds: "Because the board misinterpreted data.",
                    evidence: "Evidence text",
                    status: "PENDING",
                    deadlineAt: expectedDeadlineAt,
                }),
            })
        );

        expect(mockedDb.project.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "proj-1" },
                data: expect.objectContaining({
                    status: "UNDER_APPEAL",
                    statusHistory: expect.objectContaining({
                        create: expect.objectContaining({
                            status: "UNDER_APPEAL",
                            changedBy: "owner-1",
                        }),
                    }),
                }),
            })
        );

        expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    action: "APPEAL_FILED",
                    targetId: "proj-1",
                    userId: "owner-1",
                }),
            })
        );

        expect(mockedNotifyAdmins).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "SYSTEM",
                link: "/admin/protocol-review",
                excludeUserId: "owner-1",
                message: expect.stringContaining('Appeal filed for protocol "Protocol title"'),
            })
        );
    });

    it("still returns success if notifyAdmins throws", async () => {
        const now = new Date("2024-01-31T00:00:00.000Z");
        jest.useFakeTimers().setSystemTime(now);

        const expectedDeadlineAt = new Date(now.getTime() + PRESIDENT_RESPONSE_DAYS * 24 * 60 * 60 * 1000);

        mockSession("owner-1");

        mockedDb.project.findUnique = jest.fn().mockResolvedValue({
            id: "proj-1",
            title: "Protocol title",
            userId: "owner-1",
            status: "RESUBMIT",
            appeal: null,
            statusHistory: [{ createdAt: new Date("2024-01-15T00:00:00.000Z") }],
        });

        mockedDb.appeal.create = jest.fn().mockResolvedValue({
            id: "appeal-1",
            deadlineAt: expectedDeadlineAt,
            filedAt: new Date("2024-01-31T10:00:00.000Z"),
        });

        mockedDb.project.update = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});
        mockedNotifyAdmins.mockRejectedValue(new Error("email failed"));

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

        const result = await fileAppeal({
            projectId: "proj-1",
            grounds: "Grounds",
        });

        expect(result.id).toBe("appeal-1");
        expect(mockedDb.auditLog.create).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });
});

describe("resolveAppeal", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(resolveAppeal({ projectId: "proj-1", decision: "UPHELD", decisionText: "OK" })).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws Forbidden when user is not superadmin", async () => {
        mockSession("user-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        await expect(resolveAppeal({ projectId: "proj-1", decision: "UPHELD", decisionText: "OK" })).rejects.toThrow(
            "Forbidden: Only the committee president (super-admin) can resolve appeals"
        );
    });

    it("throws Appeal not found when there is no appeal", async () => {
        mockSession("super-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "superadmin" });
        mockedDb.appeal.findUnique = jest.fn().mockResolvedValue(null);
        await expect(resolveAppeal({ projectId: "proj-1", decision: "UPHELD", decisionText: "OK" })).rejects.toThrow(
            "Appeal not found"
        );
    });

    it("throws when appeal already resolved", async () => {
        mockSession("super-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "superadmin" });
        mockedDb.appeal.findUnique = jest.fn().mockResolvedValue({ status: "UPHELD" });
        await expect(resolveAppeal({ projectId: "proj-1", decision: "UPHELD", decisionText: "OK" })).rejects.toThrow(
            "This appeal has already been resolved"
        );
    });

    it("performs transaction and returns success on resolve", async () => {
        mockSession("super-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "superadmin" });

        const appeal = {
            id: "appeal-1",
            status: "PENDING",
            project: { id: "proj-1", title: "Title", userId: "owner-1" },
        };
        mockedDb.appeal.findUnique = jest.fn().mockResolvedValue(appeal);

        mockedDb.appeal.update = jest.fn().mockResolvedValue({});
        mockedDb.project.update = jest.fn().mockResolvedValue({});
        mockedDb.notification.create = jest.fn().mockResolvedValue({});
        mockedDb.auditLog.create = jest.fn().mockResolvedValue({});

        mockedDb.$transaction = jest.fn().mockResolvedValue([{}, {}, {}, {}]);

        const res = await resolveAppeal({ projectId: "proj-1", decision: "UPHELD", decisionText: "We uphold your appeal" });

        expect(res).toEqual({ success: true, decision: "UPHELD" });
        expect(mockedDb.appeal.update).toHaveBeenCalled();
        expect(mockedDb.project.update).toHaveBeenCalled();
        expect(mockedDb.notification.create).toHaveBeenCalled();
        expect(mockedDb.auditLog.create).toHaveBeenCalled();
        expect(mockedDb.$transaction).toHaveBeenCalled();
    });
});

describe("getProjectAppeal", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getProjectAppeal("proj-1")).rejects.toThrow("Unauthorized");
    });

    it("throws Protocol not found when project missing", async () => {
        mockSession("user-1");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue(null);
        await expect(getProjectAppeal("proj-1")).rejects.toThrow("Protocol not found");
    });

    it("throws Forbidden when caller is neither owner nor admin", async () => {
        mockSession("not-owner");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: "owner-1" });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" }); // not admin
        await expect(getProjectAppeal("proj-1")).rejects.toThrow("Forbidden");
    });

    it("returns appeal when owner requests it", async () => {
        mockSession("owner-1");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: "owner-1" });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "user" });
        const appeal = { id: "a1", projectId: "proj-1", appellant: { id: "owner-1", name: "owner", email: "o@test" } };
        mockedDb.appeal.findUnique = jest.fn().mockResolvedValue(appeal);
        const res = await getProjectAppeal("proj-1");
        expect(res).toBe(appeal);
    });

    it("returns appeal when admin requests it", async () => {
        mockSession("admin-1");
        mockedDb.project.findUnique = jest.fn().mockResolvedValue({ userId: "owner-1" });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        const appeal = { id: "a1", projectId: "proj-1", appellant: { id: "owner-1", name: "owner", email: "o@test" } };
        mockedDb.appeal.findUnique = jest.fn().mockResolvedValue(appeal);
        const res = await getProjectAppeal("proj-1");
        expect(res).toBe(appeal);
    });
});

describe("getPendingAppeals", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("throws Unauthorized when not authenticated", async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getPendingAppeals()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when not superadmin", async () => {
        mockSession("admin-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "admin" });
        await expect(getPendingAppeals()).rejects.toThrow("Forbidden: Only super-admins can view all appeals");
    });

    it("returns pending appeals for superadmin", async () => {
        mockSession("super-1");
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: "superadmin" });
        const list = [
            {
                id: "a1",
                status: "PENDING",
                project: { id: "p1", title: "T1", trackingCode: "C1" },
                appellant: { id: "u1", name: "U1", email: "u1@test" },
            },
        ];
        mockedDb.appeal.findMany = jest.fn().mockResolvedValue(list);
        const res = await getPendingAppeals();
        expect(res).toBe(list);
        expect(mockedDb.appeal.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { status: "PENDING" },
            })
        );
    });
});
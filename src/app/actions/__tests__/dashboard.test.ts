import type { verifiedAuthSession } from "@/lib/auth-utils";

jest.mock("@/lib/auth-utils", () => ({
    verifiedAuthSession: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
    isAdminRole: (role: unknown) =>
        role === "admin" || role === "superadmin",
}));

jest.mock("@/lib/db", () => ({
    db: {
        user: {},
        post: {},
        project: {},
        notification: {},
        communityTopic: {},
        auditLog: {},
        report: {},
    },
}));

import { verifiedAuthSession as importedVerifiedAuthSession } from "@/lib/auth-utils";
import { db as importedDb } from "@/lib/db";

import {
    getAdminDashboardData,
    getUserActivity,
    getUserDashboardData,
    updateProfile,
} from "@/app/actions/dashboard";

const mockedVerifiedAuthSession =
    importedVerifiedAuthSession as jest.MockedFunction<
        typeof verifiedAuthSession
    >;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    user: MockTable;
    post: MockTable;
    project: MockTable;
    notification: MockTable;
    communityTopic: MockTable;
    auditLog: MockTable;
    report: MockTable;
}

const mockedDb = importedDb as unknown as MockDb;

function createMockTable(): MockTable {
    return {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({}),
    };
}

function resetMockDb(): void {
    mockedDb.user = createMockTable();
    mockedDb.post = createMockTable();
    mockedDb.project = createMockTable();
    mockedDb.notification = createMockTable();
    mockedDb.communityTopic = createMockTable();
    mockedDb.auditLog = createMockTable();
    mockedDb.report = createMockTable();
}

function mockSession(
    userId = "user-1",
    name = "Test User",
    role: "user" | "admin" | "superadmin" = "user"
): void {
    mockedVerifiedAuthSession.mockResolvedValue({
        session: {
            id: "session-id",
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-01T00:00:00.000Z"),
            userId,
            expiresAt: new Date("2025-01-01T00:00:00.000Z"),
            token: "test-token",
            ipAddress: null,
            userAgent: null,
            impersonatedBy: null,
        },
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, "")}@test.com`,
            emailVerified: true,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-01T00:00:00.000Z"),
            image: null,
            role,
            banned: false,
            banReason: null,
            banExpires: null,
            welcomeEmailSent: false,
            gender: "male",
            profession: "researcher",
            title: null,
        },
    } as Awaited<ReturnType<typeof verifiedAuthSession>>);
}

function mockUserDashboardQueries(): void {
    mockedDb.post.count.mockResolvedValue(3);

    mockedDb.project.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

    mockedDb.notification.count.mockResolvedValue(1);

    mockedDb.post.findMany.mockResolvedValue([]);
    mockedDb.project.findMany.mockResolvedValue([]);
}

function mockAdminDashboardQueries(): void {
    mockedDb.user.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2);

    mockedDb.post.count.mockResolvedValue(5);

    mockedDb.project.count
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

    mockedDb.communityTopic.count.mockResolvedValue(3);
    mockedDb.report.count.mockResolvedValue(2);

    mockedDb.auditLog.findMany.mockResolvedValue([]);
    mockedDb.project.findMany.mockResolvedValue([]);
    mockedDb.communityTopic.findMany.mockResolvedValue([]);
}

beforeEach(() => {
    jest.clearAllMocks();
    resetMockDb();
    // Default to "no session" — individual tests opt in with mockSession().
    mockedVerifiedAuthSession.mockRejectedValue(new Error("Unauthorized"));
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("updateProfile", () => {
    it("throws Unauthorized when not authenticated", async () => {
        await expect(updateProfile()).rejects.toThrow("Unauthorized");
        expect(mockedDb.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns the expected profile fields for the current user", async () => {
        mockSession("user-1", "Alice");

        mockedDb.user.findUnique.mockResolvedValue({
            email: "alice@test.com",
            name: "Alice",
            image: null,
            gender: "female",
            role: "user",
            profession: "researcher",
            title: "Dr",
        });

        const result = await updateProfile();

        expect(result).toEqual({
            email: "alice@test.com",
            name: "Alice",
            image: null,
            gender: "female",
            role: "user",
            profession: "researcher",
            title: "Dr",
        });

        expect(mockedDb.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: "user-1",
            },
            select: {
                email: true,
                name: true,
                image: true,
                gender: true,
                role: true,
                profession: true,
                title: true,
            },
        });
    });

    it("returns null when no matching database user exists", async () => {
        mockSession("missing-user");

        mockedDb.user.findUnique.mockResolvedValue(null);

        const result = await updateProfile();

        expect(result).toBeNull();
    });

    it("returns null and logs an error when the profile query fails", async () => {
        mockSession();

        const databaseError = new Error("Profile query failed");

        mockedDb.user.findUnique.mockRejectedValue(databaseError);

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await updateProfile();

        expect(result).toBeNull();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error fetching user profile:",
            databaseError
        );
    });
});

describe("getUserActivity", () => {
    it("throws Unauthorized when not authenticated", async () => {
        await expect(getUserActivity()).rejects.toThrow("Unauthorized");
    });

    it("returns serialized posts, projects, and their total counts", async () => {
        mockSession("user-1");

        mockedDb.post.findMany.mockResolvedValue([
            {
                id: "post-1",
                content: "My research update",
                image: null,
                createdAt: new Date("2024-01-01T00:00:00.000Z"),
                _count: {
                    comments: 2,
                    likes: 3,
                },
            },
        ]);

        mockedDb.project.findMany.mockResolvedValue([
            {
                id: "project-1",
                title: "Medical Research Project",
                description: "Project description",
                status: "APPROVED",
                category: "Health",
                location: "Yaoundé",
                feedback: null,
                createdAt: new Date("2024-01-02T00:00:00.000Z"),
            },
        ]);

        mockedDb.post.count.mockResolvedValue(12);
        mockedDb.project.count.mockResolvedValue(7);

        const result = await getUserActivity();

        expect(result).toEqual({
            posts: [
                {
                    id: "post-1",
                    content: "My research update",
                    image: null,
                    createdAt: "2024-01-01T00:00:00.000Z",
                    _count: {
                        comments: 2,
                        likes: 3,
                    },
                },
            ],
            projects: [
                {
                    id: "project-1",
                    title: "Medical Research Project",
                    description: "Project description",
                    status: "APPROVED",
                    category: "Health",
                    location: "Yaoundé",
                    feedback: null,
                    createdAt: "2024-01-02T00:00:00.000Z",
                },
            ],
            totalPosts: 12,
            totalProjects: 7,
        });
    });

    it("uses page 1 and a limit of 10 by default", async () => {
        mockSession("user-1");

        await getUserActivity();

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 0,
                take: 10,
            })
        );

        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 0,
                take: 10,
            })
        );
    });

    it("uses the requested page and limit", async () => {
        mockSession("user-1");

        await getUserActivity(2, 5);

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 5,
                take: 5,
            })
        );

        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 5,
                take: 5,
            })
        );
    });

    it("falls back to page 1 and limit 10 for invalid pagination values", async () => {
        mockSession("user-1");

        await getUserActivity(0, 100);

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 0,
                take: 10,
            })
        );

        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 0,
                take: 10,
            })
        );
    });

    it("filters all activity queries by user and excludes soft-deleted records", async () => {
        mockSession("user-42");

        await getUserActivity();

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    userId: "user-42",
                    deleted: false,
                },
            })
        );

        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    userId: "user-42",
                    deleted: false,
                },
            })
        );

        expect(mockedDb.post.count).toHaveBeenCalledWith({
            where: {
                userId: "user-42",
                deleted: false,
            },
        });

        expect(mockedDb.project.count).toHaveBeenCalledWith({
            where: {
                userId: "user-42",
                deleted: false,
            },
        });
    });

    it("orders posts and projects by latest created date", async () => {
        mockSession();

        await getUserActivity();

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: {
                    createdAt: "desc",
                },
            })
        );

        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: {
                    createdAt: "desc",
                },
            })
        );
    });

    it("selects the expected post fields", async () => {
        mockSession();

        await getUserActivity();

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                select: {
                    id: true,
                    content: true,
                    image: true,
                    createdAt: true,
                    _count: {
                        select: {
                            comments: {
                                where: {
                                    deleted: false,
                                },
                            },
                            likes: true,
                        },
                    },
                },
            })
        );
    });

    it("selects the expected project fields", async () => {
        mockSession();

        await getUserActivity();

        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    category: true,
                    location: true,
                    feedback: true,
                    createdAt: true,
                },
            })
        );
    });

    it("returns empty activity data and logs an error when a database query fails", async () => {
        mockSession();

        const databaseError = new Error("Activity query failed");

        mockedDb.post.findMany.mockRejectedValue(databaseError);

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await getUserActivity();

        expect(result).toEqual({
            posts: [],
            projects: [],
            totalPosts: 0,
            totalProjects: 0,
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error fetching user activity:",
            databaseError
        );
    });
});

describe("getUserDashboardData", () => {
    it("throws Unauthorized when not authenticated", async () => {
        await expect(getUserDashboardData()).rejects.toThrow("Unauthorized");
    });

    it("returns dashboard statistics for the authenticated user", async () => {
        mockSession("user-1");
        mockUserDashboardQueries();

        const result = await getUserDashboardData();

        expect(result).toEqual({
            stats: {
                totalPosts: 3,
                totalProjects: 2,
                approvedProjects: 1,
                pendingProjects: 1,
                unreadNotifications: 1,
            },
            recentPosts: [],
            recentProjects: [],
            recentCommunityTopics: [],
        });
    });

    it("filters dashboard data using the current user id", async () => {
        mockSession("user-99");
        mockUserDashboardQueries();

        await getUserDashboardData();

        expect(mockedDb.post.count).toHaveBeenCalledWith({
            where: {
                userId: "user-99",
                deleted: false,
            },
        });

        expect(mockedDb.notification.count).toHaveBeenCalledWith({
            where: {
                userId: "user-99",
                read: false,
            },
        });
    });

    it("returns null and logs an error when a user dashboard query fails", async () => {
        mockSession();

        const databaseError = new Error("User dashboard query failed");

        mockedDb.post.count.mockRejectedValue(databaseError);

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await getUserDashboardData();

        expect(result).toBeNull();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error fetching user dashboard data:",
            databaseError
        );
    });
});

describe("getAdminDashboardData", () => {
    it("throws Unauthorized when not authenticated", async () => {
        await expect(getAdminDashboardData()).rejects.toThrow("Unauthorized");
    });

    it("returns null when the user is not an administrator", async () => {
        mockSession("user-1", "Normal User", "user");

        mockedDb.user.findUnique.mockResolvedValue({
            role: "user",
        });

        const result = await getAdminDashboardData();

        expect(result).toBeNull();

        expect(mockedDb.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: "user-1",
            },
            select: {
                role: true,
            },
        });
    });

    it("returns admin dashboard data for an administrator", async () => {
        mockSession("admin-1", "Admin User", "admin");

        mockedDb.user.findUnique.mockResolvedValue({
            role: "admin",
        });

        mockAdminDashboardQueries();

        const result = await getAdminDashboardData();

        expect(result).toEqual({
            isSuperAdmin: false,
            stats: {
                totalUsers: 10,
                activeUsers: 8,
                bannedUsers: 2,
                totalPosts: 5,
                totalProjects: 4,
                approvedProjects: 2,
                rejectedProjects: 1,
                pendingProjects: 1,
                totalTopics: 3,
                pendingReports: 2,
            },
            recentAuditLogs: [],
            recentProjects: [],
            recentCommunityTopics: [],
        });
    });

    it("returns superadmin dashboard data with isSuperAdmin set to true", async () => {
        mockSession("superadmin-1", "Super Admin", "superadmin");

        mockedDb.user.findUnique.mockResolvedValue({
            role: "superadmin",
        });

        mockAdminDashboardQueries();

        const result = await getAdminDashboardData();

        expect(result).not.toBeNull();
        expect(result?.isSuperAdmin).toBe(true);

        expect(mockedDb.user.count).toHaveBeenCalledWith({
            where: {},
        });

        expect(mockedDb.auditLog.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {},
            })
        );
    });

    it("limits normal admin user counts to the user role", async () => {
        mockSession("admin-1", "Admin User", "admin");

        mockedDb.user.findUnique.mockResolvedValue({
            role: "admin",
        });

        mockAdminDashboardQueries();

        await getAdminDashboardData();

        expect(mockedDb.user.count).toHaveBeenNthCalledWith(1, {
            where: {
                role: "user",
            },
        });

        expect(mockedDb.user.count).toHaveBeenNthCalledWith(2, {
            where: {
                role: "user",
                banned: true,
            },
        });
    });

    it("returns null and logs an error when the admin role query fails", async () => {
        mockSession("admin-1", "Admin User", "admin");

        const databaseError = new Error("Admin role query failed");

        mockedDb.user.findUnique.mockRejectedValue(databaseError);

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const result = await getAdminDashboardData();

        expect(result).toBeNull();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error fetching admin dashboard data:",
            databaseError
        );
    });
});
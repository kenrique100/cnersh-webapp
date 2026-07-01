import type { authSession } from '@/lib/auth-utils';
import type { db as DbType } from '@/lib/db';

// ── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
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

// ── Typed references ──────────────────────────────────────────────────

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;

/**
 * Each Prisma table is replaced with a plain Record of jest.Mock functions
 * in beforeEach, so we type the whole db as unknown first, then cast.
 */
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

const mockedDb = _db as unknown as MockDb;

// ── Imports under test (must come after jest.mock calls) ──────────────

import {
    updateProfile,
    getUserActivity,
    getUserDashboardData,
    getAdminDashboardData,
} from '@/app/actions/dashboard';

// ── Session helper ────────────────────────────────────────────────────

/**
 * Provides the minimal shape that better-auth's getSession() returns.
 * Uses `as` cast so the test stays resilient to future additionalFields
 * additions in auth.ts without needing to update every test.
 */
function mockSession(userId = 'user-1', name = 'Test User'): void {
    mockedAuthSession.mockResolvedValue({
        session: {
            id: 'session-id',
            createdAt: new Date(),
            updatedAt: new Date(),
            userId,
            expiresAt: new Date(Date.now() + 86_400_000),
            token: 'token',
            ipAddress: null,
            userAgent: null,
            impersonatedBy: null,
        },
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, '')}@test.com`,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            image: null,
            role: 'user',
            banned: false,
            banReason: null,
            banExpires: null,
            welcomeEmailSent: false,
            gender: 'male',
            profession: null,
            title: null,
        },
    } as Awaited<ReturnType<typeof authSession>>);
}

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    // Reset every table to a fresh plain object so tests can attach
    // jest.fn() properties without hitting Prisma's read-only types.
    mockedDb.user = {};
    mockedDb.post = {};
    mockedDb.project = {};
    mockedDb.notification = {};
    mockedDb.communityTopic = {};
    mockedDb.auditLog = {};
    mockedDb.report = {};

    // Keep the live reference in sync so action modules see the reset tables.
    ((_db as unknown) as MockDb).user = mockedDb.user;
    ((_db as unknown) as MockDb).post = mockedDb.post;
    ((_db as unknown) as MockDb).project = mockedDb.project;
    ((_db as unknown) as MockDb).notification = mockedDb.notification;
    ((_db as unknown) as MockDb).communityTopic = mockedDb.communityTopic;
    ((_db as unknown) as MockDb).auditLog = mockedDb.auditLog;
    ((_db as unknown) as MockDb).report = mockedDb.report;
});

// ── updateProfile ─────────────────────────────────────────────────────

describe('updateProfile', () => {
    it('returns user profile when authenticated', async () => {
        mockSession('user-1', 'Test User');

        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            email: 'test@test.com',
            name: 'Test',
            image: null,
            role: 'user',
            profession: 'Dev',
            title: 'Mr',
        });

        const profile = await updateProfile();

        expect(profile).toHaveProperty('email', 'test@test.com');
        expect(profile).toHaveProperty('profession', 'Dev');
        expect(mockedDb.user.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
            })
        );
    });

    it('returns null if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        expect(await updateProfile()).toBeNull();
    });

    it('returns null on database error', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockRejectedValue(new Error('DB error'));

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        expect(await updateProfile()).toBeNull();

        consoleErrorSpy.mockRestore();
    });
});

// ── getUserActivity ───────────────────────────────────────────────────

describe('getUserActivity', () => {
    it('returns posts and projects with counts', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([
            {
                id: 'p1',
                content: 'post',
                image: null,
                createdAt: new Date('2024-01-01'),
                _count: { comments: 0, likes: 0 },
            },
        ]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([
            {
                id: 'proj1',
                title: 'Proj',
                description: 'desc',
                status: 'APPROVED',
                category: 'cat',
                location: null,
                feedback: null,
                createdAt: new Date('2024-01-02'),
            },
        ]);
        mockedDb.post.count = jest.fn().mockResolvedValue(1);
        mockedDb.project.count = jest.fn().mockResolvedValue(1);

        const result = await getUserActivity();

        expect(result.totalPosts).toBe(1);
        expect(result.totalProjects).toBe(1);
        expect(result.posts).toHaveLength(1);
        expect(result.projects).toHaveLength(1);
        // Dates are serialised to ISO strings
        expect(typeof result.posts[0].createdAt).toBe('string');
        expect(typeof result.projects[0].createdAt).toBe('string');
    });

    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(getUserActivity()).rejects.toThrow('Unauthorized');
    });

    it('returns empty arrays on database error', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockRejectedValue(new Error('fail'));
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const result = await getUserActivity();

        expect(result.posts).toEqual([]);
        expect(result.projects).toEqual([]);
        expect(result.totalPosts).toBe(0);
        expect(result.totalProjects).toBe(0);

        consoleErrorSpy.mockRestore();
    });

    it('respects pagination parameters', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);

        await getUserActivity(2, 5);

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 5, take: 5 })
        );
    });
});

// ── getUserDashboardData ──────────────────────────────────────────────

describe('getUserDashboardData', () => {
    it('returns null if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        expect(await getUserDashboardData()).toBeNull();
    });

    it('returns dashboard stats for authenticated user', async () => {
        mockSession('user-1');

        mockedDb.post.count = jest.fn().mockResolvedValue(3);
        mockedDb.project.count = jest.fn().mockResolvedValue(2);
        mockedDb.notification.count = jest.fn().mockResolvedValue(1);
        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.communityTopic.findMany = jest.fn().mockResolvedValue([]);

        const result = await getUserDashboardData();

        expect(result).not.toBeNull();
        expect(result?.stats.totalPosts).toBe(3);
    });

    it('returns null on database error', async () => {
        mockSession('user-1');

        mockedDb.post.count = jest.fn().mockRejectedValue(new Error('fail'));
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        mockedDb.notification.count = jest.fn().mockResolvedValue(0);
        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.communityTopic.findMany = jest.fn().mockResolvedValue([]);

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        expect(await getUserDashboardData()).toBeNull();

        consoleErrorSpy.mockRestore();
    });
});

// ── getAdminDashboardData ─────────────────────────────────────────────

describe('getAdminDashboardData', () => {
    it('returns null if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        expect(await getAdminDashboardData()).toBeNull();
    });

    it('returns null if user is not admin', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        expect(await getAdminDashboardData()).toBeNull();
    });

    it('returns admin dashboard data for admin role', async () => {
        mockSession('admin-1', 'Admin User');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.user.count = jest.fn().mockResolvedValue(10);
        mockedDb.post.count = jest.fn().mockResolvedValue(5);
        mockedDb.project.count = jest.fn().mockResolvedValue(4);
        mockedDb.communityTopic.count = jest.fn().mockResolvedValue(3);
        mockedDb.report.count = jest.fn().mockResolvedValue(2);
        mockedDb.auditLog.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.communityTopic.findMany = jest.fn().mockResolvedValue([]);

        const result = await getAdminDashboardData();

        expect(result).not.toBeNull();
        expect(result?.isSuperAdmin).toBe(false);
        expect(result?.stats.totalUsers).toBe(10);
    });

    it('sets isSuperAdmin correctly for superadmin role', async () => {
        mockSession('super-1', 'Super Admin');
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'superadmin' });
        mockedDb.user.count = jest.fn().mockResolvedValue(20);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        mockedDb.communityTopic.count = jest.fn().mockResolvedValue(0);
        mockedDb.report.count = jest.fn().mockResolvedValue(0);
        mockedDb.auditLog.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.communityTopic.findMany = jest.fn().mockResolvedValue([]);

        const result = await getAdminDashboardData();

        expect(result?.isSuperAdmin).toBe(true);
    });

    it('returns null on database error', async () => {
        mockSession('admin-1');
        mockedDb.user.findUnique = jest.fn().mockRejectedValue(new Error('fail'));

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        expect(await getAdminDashboardData()).toBeNull();

        consoleErrorSpy.mockRestore();
    });
});
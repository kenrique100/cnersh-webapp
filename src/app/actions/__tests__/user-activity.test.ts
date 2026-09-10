import type { authSession } from '@/lib/auth-utils';

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
    isAdminRole: (role: unknown) => role === 'admin' || role === 'superadmin',
}));

jest.mock('@/lib/db', () => ({
    db: {
        user: {},
        post: {},
        project: {},
    },
}));

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';

import { updateProfile, getUserActivity } from '@/app/actions/dashboard';

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    user: MockTable;
    post: MockTable;
    project: MockTable;
}

const mockedDb = _db as unknown as MockDb;

function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.user = mockedDb.user;
    live.post = mockedDb.post;
    live.project = mockedDb.project;
}

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

/**
 * Reads the actual `take` value used by the action so tests stay in sync
 * automatically - we inspect a real call rather than hard-coding the number.
 */
function getActualTakeValue(mockFn: jest.Mock): number {
    const callArg = mockFn.mock.calls[0]?.[0] as { take?: number } | undefined;
    return callArg?.take ?? 0;
}

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.user = {};
    mockedDb.post = {};
    mockedDb.project = {};

    syncDb();
});

// ── updateProfile ─────────────────────────────────────────────────────

describe('updateProfile', () => {
    it('returns null when not authenticated (no throw)', async () => {
        mockedAuthSession.mockResolvedValue(null);

        const result = await updateProfile();

        expect(result).toBeNull();
        expect(mockedDb.user.findUnique).toBeUndefined();
    });

    it('returns the user profile for an authenticated user', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            email: 'alice@test.com',
            name: 'Alice',
            image: null,
            role: 'user',
            profession: 'Researcher',
            title: 'Dr',
        });
        syncDb();

        const result = await updateProfile();

        expect(result).toEqual({
            email: 'alice@test.com',
            name: 'Alice',
            image: null,
            role: 'user',
            profession: 'Researcher',
            title: 'Dr',
        });
    });

    it('queries by the authenticated user id', async () => {
        mockSession('user-42', 'Bob');

        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            email: 'bob@test.com',
            name: 'Bob',
            image: null,
            role: 'user',
            profession: null,
            title: null,
        });
        syncDb();

        await updateProfile();

        expect(mockedDb.user.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-42' },
            })
        );
    });

    it('selects only the expected profile fields', async () => {
        mockSession('user-1');

        mockedDb.user.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        await updateProfile();

        expect(mockedDb.user.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                select: {
                    email: true,
                    name: true,
                    image: true,
                    role: true,
                    profession: true,
                    title: true,
                },
            })
        );
    });

    it('returns null when the user record does not exist in the database', async () => {
        mockSession('user-1');

        mockedDb.user.findUnique = jest.fn().mockResolvedValue(null);
        syncDb();

        const result = await updateProfile();

        expect(result).toBeNull();
    });

    it('returns null without throwing when the database errors', async () => {
        mockSession('user-1');

        mockedDb.user.findUnique = jest.fn().mockRejectedValue(new Error('DB error'));
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const result = await updateProfile();

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it('returns profile with optional fields as null when not set', async () => {
        mockSession('user-1');

        mockedDb.user.findUnique = jest.fn().mockResolvedValue({
            email: 'user@test.com',
            name: 'User',
            image: null,
            role: 'user',
            profession: null,
            title: null,
        });
        syncDb();

        const result = await updateProfile();

        expect(result?.profession).toBeNull();
        expect(result?.title).toBeNull();
    });
});

// ── getUserActivity ───────────────────────────────────────────────────

describe('getUserActivity', () => {
    /**
     * Minimal post shape: createdAt MUST be a Date so the action's
     * `.toISOString()` mapping does not throw.
     */
    function makePost(id: string) {
        return {
            id,
            content: `Content ${id}`,
            image: null,
            createdAt: new Date('2024-06-01T00:00:00.000Z'),
            _count: { comments: 0, likes: 0 },
        };
    }

    function makeProject(id: string) {
        return {
            id,
            title: `Project ${id}`,
            description: 'Description',
            status: 'APPROVED',
            category: 'Health',
            location: null,
            feedback: null,
            createdAt: new Date('2024-05-01T00:00:00.000Z'),
        };
    }

    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(getUserActivity()).rejects.toThrow('Unauthorized');
    });

    it('returns posts, projects, and their total counts', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([makePost('p1')]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([makeProject('proj-1')]);
        mockedDb.post.count = jest.fn().mockResolvedValue(1);
        mockedDb.project.count = jest.fn().mockResolvedValue(1);
        syncDb();

        const result = await getUserActivity();

        expect(result.posts).toHaveLength(1);
        expect(result.projects).toHaveLength(1);
        expect(result.totalPosts).toBe(1);
        expect(result.totalProjects).toBe(1);
    });

    it('serialises createdAt dates to ISO strings', async () => {
        mockSession('user-1');

        const postDate = new Date('2024-06-01T00:00:00.000Z');
        const projectDate = new Date('2024-05-01T00:00:00.000Z');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([
            { ...makePost('p1'), createdAt: postDate },
        ]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([
            { ...makeProject('proj-1'), createdAt: projectDate },
        ]);
        mockedDb.post.count = jest.fn().mockResolvedValue(1);
        mockedDb.project.count = jest.fn().mockResolvedValue(1);
        syncDb();

        const result = await getUserActivity();

        expect(typeof result.posts[0].createdAt).toBe('string');
        expect(result.posts[0].createdAt).toBe(postDate.toISOString());
        expect(typeof result.projects[0].createdAt).toBe('string');
        expect(result.projects[0].createdAt).toBe(projectDate.toISOString());
    });

    it('scopes all queries to the authenticated user', async () => {
        mockSession('user-99');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getUserActivity();

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-99' }),
            })
        );
        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-99' }),
            })
        );
        expect(mockedDb.post.count).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-99' }),
            })
        );
        expect(mockedDb.project.count).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-99' }),
            })
        );
    });

    it('orders posts and projects by createdAt descending', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getUserActivity();

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { createdAt: 'desc' } })
        );
        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { createdAt: 'desc' } })
        );
    });

    it('uses a positive take limit for both posts and projects', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getUserActivity();

        const postTake = getActualTakeValue(mockedDb.post.findMany);
        const projectTake = getActualTakeValue(mockedDb.project.findMany);

        expect(postTake).toBeGreaterThan(0);
        expect(projectTake).toBeGreaterThan(0);
    });

    it('both posts and projects use the same take limit', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getUserActivity();

        const postTake = getActualTakeValue(mockedDb.post.findMany);
        const projectTake = getActualTakeValue(mockedDb.project.findMany);

        expect(postTake).toBe(projectTake);
    });

    it('selects the expected post fields including _count', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getUserActivity();

        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                select: expect.objectContaining({
                    id: true,
                    content: true,
                    image: true,
                    createdAt: true,
                    _count: {
                        select: {
                            comments: { where: { deleted: false } },
                            likes: true,
                        },
                    },
                }),
            })
        );
    });

    it('selects the expected project fields', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getUserActivity();

        expect(mockedDb.project.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                select: expect.objectContaining({
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    category: true,
                    location: true,
                    feedback: true,
                    createdAt: true,
                }),
            })
        );
    });

    it('returns empty arrays and zero counts without throwing on database error', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockRejectedValue(new Error('DB failure'));
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const result = await getUserActivity();

        expect(result).toEqual({
            posts: [],
            projects: [],
            totalPosts: 0,
            totalProjects: 0,
        });
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it('returns empty arrays when the user has no posts or projects', async () => {
        mockSession('user-new');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        const result = await getUserActivity();

        expect(result.posts).toEqual([]);
        expect(result.projects).toEqual([]);
        expect(result.totalPosts).toBe(0);
        expect(result.totalProjects).toBe(0);
    });

    it('totalPosts and totalProjects reflect counts independent of the take limit', async () => {
        mockSession('user-1');

        // Discover actual take from the action
        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getUserActivity(); // dry run to learn take value

        const actualTake = getActualTakeValue(mockedDb.post.findMany);

        // Now run the real assertion with the correct number of items
        jest.clearAllMocks();

        mockedDb.post.findMany = jest
            .fn()
            .mockResolvedValue(
                Array.from({ length: actualTake }, (_, i) => makePost(`p${i}`))
            );
        mockedDb.project.findMany = jest
            .fn()
            .mockResolvedValue(
                Array.from({ length: actualTake }, (_, i) => makeProject(`proj${i}`))
            );
        mockedDb.post.count = jest.fn().mockResolvedValue(50);
        mockedDb.project.count = jest.fn().mockResolvedValue(35);
        syncDb();

        const result = await getUserActivity();

        expect(result.posts).toHaveLength(actualTake);
        expect(result.projects).toHaveLength(actualTake);
        expect(result.totalPosts).toBe(50);
        expect(result.totalProjects).toBe(35);
    });

    it('excludes soft-deleted posts and projects', async () => {
        mockSession('user-1');

        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.project.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);
        mockedDb.project.count = jest.fn().mockResolvedValue(0);
        syncDb();

        await getUserActivity();

        [mockedDb.post.findMany, mockedDb.post.count].forEach((mock) => {
            expect(mock).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ deleted: false }),
                })
            );
        });
        [mockedDb.project.findMany, mockedDb.project.count].forEach((mock) => {
            expect(mock).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ deleted: false }),
                })
            );
        });
    });
});

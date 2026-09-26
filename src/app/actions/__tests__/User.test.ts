import { updateProfile, getUserActivity } from '@/app/actions/user';

// ── Mock auth-utils ───────────────────────────────────────────────
const mockVerifiedAuthSession = jest.fn();
jest.mock('@/lib/auth-utils', () => ({
    verifiedAuthSession: () => mockVerifiedAuthSession(),
}));

// ── Mock db ───────────────────────────────────────────────────────
const mockUserFindUnique = jest.fn();
const mockPostFindMany = jest.fn();
const mockProjectFindMany = jest.fn();
const mockPostCount = jest.fn();
const mockProjectCount = jest.fn();

jest.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
        post: {
            findMany: (...a: unknown[]) => mockPostFindMany(...a),
            count: (...a: unknown[]) => mockPostCount(...a),
        },
        project: {
            findMany: (...a: unknown[]) => mockProjectFindMany(...a),
            count: (...a: unknown[]) => mockProjectCount(...a),
        },
    },
}));

const SESSION = {
    session: {
        id: 'session-id',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        userId: 'user-1',
        expiresAt: new Date('2025-01-01T00:00:00.000Z'),
        token: 'test-token',
        ipAddress: null,
        userAgent: null,
        impersonatedBy: null,
    },
    user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        image: null,
        role: 'user',
        banned: false,
        banReason: null,
        banExpires: null,
        welcomeEmailSent: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        gender: 'male',
        profession: 'Researcher',
        title: 'Dr.',
    },
};

const PROFILE = {
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    gender: 'male',
    role: 'user',
    profession: 'Researcher',
    title: 'Dr.',
};

const POSTS = [
    {
        id: 'p1', content: 'Hello', image: null,
        createdAt: new Date(), _count: { comments: 2, likes: 5 },
    },
];

const PROJECTS = [
    {
        id: 'pr1', title: 'Study', description: 'Desc',
        status: 'PENDING', category: 'Health', location: 'Yaoundé',
        feedback: null, createdAt: new Date(),
    },
];

// ── updateProfile ─────────────────────────────────────────────────
describe('updateProfile', () => {
    beforeEach(() => jest.clearAllMocks());

    it('throws Unauthorized when session is missing', async () => {
        mockVerifiedAuthSession.mockRejectedValueOnce(new Error('Unauthorized'));

        await expect(updateProfile()).rejects.toThrow('Unauthorized');
        expect(mockUserFindUnique).not.toHaveBeenCalled();
    });

    it('queries db with correct where/select when session exists', async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);
        mockUserFindUnique.mockResolvedValueOnce(PROFILE);

        const result = await updateProfile();

        expect(mockUserFindUnique).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            select: {
                email: true, name: true, image: true, gender: true,
                role: true, profession: true, title: true,
            },
        });
        expect(result).toEqual(PROFILE);
    });

    it('returns null (and logs error) when db throws', async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);
        mockUserFindUnique.mockRejectedValueOnce(new Error('DB error'));
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const result = await updateProfile();
        expect(result).toBeNull();
        expect(spy).toHaveBeenCalledWith(
            'Error fetching user profile:',
            expect.any(Error)
        );
        spy.mockRestore();
    });

    it('returns null when findUnique returns null (user not found)', async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);
        mockUserFindUnique.mockResolvedValueOnce(null);
        const result = await updateProfile();
        expect(result).toBeNull();
    });
});

// ── getUserActivity ───────────────────────────────────────────────
describe('getUserActivity', () => {
    beforeEach(() => jest.clearAllMocks());

    it('throws Unauthorized when session is missing', async () => {
        mockVerifiedAuthSession.mockRejectedValueOnce(new Error('Unauthorized'));
        await expect(getUserActivity()).rejects.toThrow('Unauthorized');
    });

    it('returns posts, projects, and counts on success', async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);
        mockPostFindMany.mockResolvedValueOnce(POSTS);
        mockProjectFindMany.mockResolvedValueOnce(PROJECTS);
        mockPostCount.mockResolvedValueOnce(42);
        mockProjectCount.mockResolvedValueOnce(7);

        const result = await getUserActivity();

        expect(result).toEqual({
            posts: POSTS,
            projects: PROJECTS,
            totalPosts: 42,
            totalProjects: 7,
        });
    });

    it('passes correct query args for posts', async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);
        mockPostFindMany.mockResolvedValueOnce([]);
        mockProjectFindMany.mockResolvedValueOnce([]);
        mockPostCount.mockResolvedValueOnce(0);
        mockProjectCount.mockResolvedValueOnce(0);

        await getUserActivity();

        expect(mockPostFindMany).toHaveBeenCalledWith({
            where: { userId: 'user-1', deleted: false },
            select: {
                id: true, content: true, image: true, createdAt: true,
                _count: {
                    select: {
                        comments: { where: { deleted: false } },
                        likes: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    });

    it('passes correct query args for projects', async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);
        mockPostFindMany.mockResolvedValueOnce([]);
        mockProjectFindMany.mockResolvedValueOnce([]);
        mockPostCount.mockResolvedValueOnce(0);
        mockProjectCount.mockResolvedValueOnce(0);

        await getUserActivity();

        expect(mockProjectFindMany).toHaveBeenCalledWith({
            where: { userId: 'user-1', deleted: false },
            select: {
                id: true, title: true, description: true,
                status: true, category: true, location: true,
                feedback: true, createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    });

    it('returns empty fallback (and logs error) when db throws', async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);
        mockPostFindMany.mockRejectedValueOnce(new Error('DB failure'));
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await getUserActivity();

        expect(result).toEqual({
            posts: [], projects: [], totalPosts: 0, totalProjects: 0,
        });
        expect(spy).toHaveBeenCalledWith(
            'Error fetching user activity:',
            expect.any(Error)
        );
        spy.mockRestore();
    });

    it('uses Promise.all to run all four queries concurrently', async () => {
        mockVerifiedAuthSession.mockResolvedValueOnce(SESSION);
        const order: string[] = [];
        mockPostFindMany.mockImplementation(async () => { order.push('postFindMany'); return []; });
        mockProjectFindMany.mockImplementation(async () => { order.push('projectFindMany'); return []; });
        mockPostCount.mockImplementation(async () => { order.push('postCount'); return 0; });
        mockProjectCount.mockImplementation(async () => { order.push('projectCount'); return 0; });

        await getUserActivity();

        expect(order).toHaveLength(4);
        expect(order).toContain('postFindMany');
        expect(order).toContain('projectFindMany');
        expect(order).toContain('postCount');
        expect(order).toContain('projectCount');
    });
});
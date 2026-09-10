import {
    createPost,
    getPosts,
    getPublicPosts,
    toggleLike,
    addComment,
    getPostComments,
    deletePost,
    updatePost,
    togglePostComments,
    getUserActivity,
    toggleCommentLike,
    editComment,
    deleteComment,
    searchUsers,
    getAllUsers,
    getPostLikers,
} from '@/app/actions/feed';

import { authSession } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { notifyAdmins } from '@/lib/notify-admins';
import { sendNotificationEmail } from '@/lib/send-notification-email';
import { enforceActionRateLimit } from '@/lib/action-rate-limit';

// ── Types ────────────────────────────────────────────────────────────

/**
 * Represents a single Prisma model table with arbitrary jest mock methods.
 * Using Record<string, jest.Mock> avoids `any` while staying flexible.
 */
type MockTable = Record<string, jest.Mock>;

/**
 * Shape of the mocked db object.
 * Each table is a MockTable; raw query is also a jest.Mock.
 */
interface MockDb {
    post: MockTable;
    user: MockTable;
    notification: MockTable;
    like: MockTable;
    comment: MockTable;
    commentLike: MockTable;
    $queryRaw: jest.Mock;
}

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
    isAdminRole: (role: unknown) => role === 'admin' || role === 'superadmin',
    canManageRole: (actor: string, target: string) =>
        ({ user: 0, admin: 1, superadmin: 2 }[actor] ?? -1) >
        ({ user: 0, admin: 1, superadmin: 2 }[target] ?? 99),
}));

jest.mock('@/lib/db', () => ({
    db: {
        post: {},
        user: {},
        notification: {},
        like: {},
        comment: {},
        commentLike: {},
        $queryRaw: jest.fn(),
    },
}));

jest.mock('@/lib/notify-admins', () => ({
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/send-notification-email', () => ({
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/action-rate-limit', () => ({
    enforceActionRateLimit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/rate-limit', () => ({
    RATE_LIMITS: {
        postCreate: { windowMs: 60_000, maxRequests: 8 },
        commentCreate: { windowMs: 60_000, maxRequests: 20 },
        likeToggle: { windowMs: 60_000, maxRequests: 80 },
    },
}));

// ── Typed mock references ────────────────────────────────────────────

const mockedAuthSession = authSession as jest.MockedFunction<typeof authSession>;
const mockedDb = db as unknown as MockDb;
const mockedNotifyAdmins = notifyAdmins as jest.MockedFunction<typeof notifyAdmins>;
const mockedSendNotificationEmail = sendNotificationEmail as jest.MockedFunction<
    typeof sendNotificationEmail
>;
const mockedEnforceActionRateLimit = enforceActionRateLimit as jest.MockedFunction<
    typeof enforceActionRateLimit
>;

// ── Helpers ──────────────────────────────────────────────────────────

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
        },
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase().replace(' ', '')}@test.com`,
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
    });
}

function mockUser(
    id: string,
    name: string,
    extra?: Partial<{ email: string; role: string }>
): {
    id: string;
    name: string;
    image: null;
    profession: null;
    title: null;
    email: string;
    role: string;
} {
    return {
        id,
        name,
        image: null,
        profession: null,
        title: null,
        email: extra?.email ?? `${name}@test.com`,
        role: extra?.role ?? 'user',
    };
}

// ── Setup / Teardown ─────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    mockedEnforceActionRateLimit.mockResolvedValue(undefined);

    // Re-assign each table to a fresh plain object so individual tests
    // can attach jest.fn() properties without TypeScript complaining about
    // read-only Prisma types.
    mockedDb.post = {};
    mockedDb.user = {};
    mockedDb.notification = {};
    mockedDb.like = {};
    mockedDb.comment = {};
    mockedDb.commentLike = {};
    mockedDb.$queryRaw = jest.fn();
    mockSession('user-1', 'Alice');
    mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
    mockedDb.post.findUnique = jest.fn().mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        deleted: false,
        commentsEnabled: true,
        user: { role: 'user', email: 'alice@test.com', name: 'Alice' },
    });
    mockedDb.comment.findUnique = jest.fn().mockResolvedValue({
        id: 'c1',
        userId: 'user-1',
        postId: 'p1',
        deleted: false,
        post: { deleted: false, commentsEnabled: true },
        user: { role: 'user', email: 'alice@test.com', name: 'Alice' },
    });

    // Keep the live reference in sync so the action modules see the reset tables.
    (db as unknown as MockDb).post = mockedDb.post;
    (db as unknown as MockDb).user = mockedDb.user;
    (db as unknown as MockDb).notification = mockedDb.notification;
    (db as unknown as MockDb).like = mockedDb.like;
    (db as unknown as MockDb).comment = mockedDb.comment;
    (db as unknown as MockDb).commentLike = mockedDb.commentLike;
    (db as unknown as MockDb).$queryRaw = mockedDb.$queryRaw;
});

// ── createPost ───────────────────────────────────────────────────────

describe('createPost', () => {
    it('throws "Unauthorized" if user is not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(createPost({ content: 'Hello' })).rejects.toThrow('Unauthorized');
    });

    it('creates a post and returns serialised plain object', async () => {
        mockSession('user-1', 'Alice');
        const now = new Date('2024-01-01T00:00:00Z');
        const fakePost = {
            id: 'p1',
            content: 'Hello @Bob',
            image: null,
            video: null,
            images: [],
            videos: [],
            tags: [],
            linkUrl: null,
            linkType: null,
            commentsEnabled: true,
            userId: 'user-1',
            deleted: false,
            createdAt: now,
            updatedAt: now,
            user: mockUser('user-1', 'Alice'),
            _count: { comments: 0, likes: 0 },
        };

        mockedDb.post.create = jest.fn().mockResolvedValue(fakePost);
        mockedDb.user.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.notification.createMany = jest.fn();

        const result = await createPost({ content: 'Hello @Bob', tags: ['test'] });

        expect(mockedDb.post.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    content: 'Hello @Bob',
                    userId: 'user-1',
                    tags: ['test'],
                }),
            })
        );
        expect(result).toEqual({
            ...fakePost,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        });
        expect(mockedDb.notification.createMany).not.toHaveBeenCalled();
    });

    it('creates mention notifications for valid mentioned users', async () => {
        mockSession('user-1', 'Alice');
        const now = new Date();
        const fakePost = {
            id: 'p2',
            content: 'Hi @Bob and @Charlie',
            createdAt: now,
            updatedAt: now,
            user: mockUser('user-1', 'Alice'),
            _count: { comments: 0, likes: 0 },
        };
        mockedDb.post.create = jest.fn().mockResolvedValue(fakePost);
        mockedDb.user.findMany = jest.fn().mockResolvedValue([
            { id: 'bob-id', name: 'Bob', email: 'bob@test.com' },
            { id: 'charlie-id', name: 'Charlie', email: 'charlie@test.com' },
        ]);
        mockedDb.notification.createMany = jest.fn();

        await createPost({ content: 'Hi @Bob and @Charlie' });

        expect(mockedDb.notification.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'MENTION',
                        message: 'Alice mentioned you in a post',
                        link: '/feeds',
                        userId: 'bob-id',
                    }),
                    expect.objectContaining({
                        type: 'MENTION',
                        message: 'Alice mentioned you in a post',
                        link: '/feeds',
                        userId: 'charlie-id',
                    }),
                ]),
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledTimes(2);
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'bob@test.com',
                userName: 'Bob',
                notificationType: 'MENTION',
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'charlie@test.com',
                userName: 'Charlie',
                notificationType: 'MENTION',
            })
        );
    });

    it('handles database error gracefully', async () => {
        mockSession();
        mockedDb.post.create = jest.fn().mockRejectedValue(new Error('DB error'));

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        await expect(createPost({ content: 'test' })).rejects.toThrow('Failed to save post');

        consoleErrorSpy.mockRestore();
    });
});

// ── getPosts ──────────────────────────────────────────────────────────

describe('getPosts', () => {
    it('rejects unauthenticated feed reads', async () => {
        mockedAuthSession.mockResolvedValue(null);
        mockedDb.post.findMany = jest.fn();

        await expect(getPosts()).rejects.toThrow('Unauthorized');
        expect(mockedDb.post.findMany).not.toHaveBeenCalled();
    });

    it('returns paginated posts with recentActivity', async () => {
        const mockPosts = [
            {
                id: 'p1',
                content: 'Post 1',
                user: mockUser('u1', 'Alice'),
                _count: { comments: 2, likes: 3 },
                likes: [
                    {
                        userId: 'u2',
                        reactionType: 'Like',
                        user: { id: 'u2', name: 'Bob', image: null },
                    },
                    {
                        userId: 'u3',
                        reactionType: 'Like',
                        user: { id: 'u3', name: 'Charlie', image: null },
                    },
                ],
                comments: [
                    { user: { id: 'u2', name: 'Bob', image: null } },
                    { user: { id: 'u4', name: 'Dave', image: null } },
                ],
            },
        ];
        mockedDb.post.findMany = jest.fn().mockResolvedValue(mockPosts);
        mockedDb.post.count = jest.fn().mockResolvedValue(1);

        const result = await getPosts(1, 10);

        expect(result.total).toBe(1);
        expect(result.pages).toBe(1);
        expect(result.posts).toHaveLength(1);

        const post = result.posts[0];
        expect(post.recentActivity.users).toHaveLength(3); // Bob, Charlie, Dave
        expect(post.recentActivity.likeCount).toBe(3);
        expect(post.recentActivity.commentCount).toBe(2);
    });

    it('filters by userId when provided', async () => {
        mockedDb.post.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.post.count = jest.fn().mockResolvedValue(0);

        await getPosts(1, 10, 'target-user');
        expect(mockedDb.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { deleted: false, userId: 'target-user' },
            })
        );
    });

    it('handles fetch error gracefully', async () => {
        mockedDb.post.findMany = jest.fn().mockRejectedValue(new Error('fail'));
        mockedDb.post.count = jest.fn().mockResolvedValue(0);

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const result = await getPosts(1, 10);
        expect(result).toEqual({ posts: [], total: 0, pages: 0 });

        consoleErrorSpy.mockRestore();
    });
});

// ── getPublicPosts ────────────────────────────────────────────────────

describe('getPublicPosts', () => {
    it('returns public posts with limited likes', async () => {
        const mockPosts = [
            {
                id: 'pp1',
                content: 'Public',
                user: mockUser('u1', 'Alice'),
                _count: { comments: 0, likes: 0 },
                likes: [{ reactionType: 'Like' }],
            },
        ];
        mockedDb.post.findMany = jest.fn().mockResolvedValue(mockPosts);

        const posts = await getPublicPosts(5);
        expect(posts).toHaveLength(1);
        expect(posts[0].likes).toEqual([{ reactionType: 'Like' }]);
    });

    it('returns empty array on error', async () => {
        mockedDb.post.findMany = jest.fn().mockRejectedValue(new Error('fail'));

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        expect(await getPublicPosts()).toEqual([]);
        consoleErrorSpy.mockRestore();
    });
});

// ── toggleLike ────────────────────────────────────────────────────────

describe('toggleLike', () => {
    const postId = 'post-1';

    it('throws if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(toggleLike(postId)).rejects.toThrow('Unauthorized');
    });

    it('creates a like and sends notifications when no existing like', async () => {
        mockSession('user-2', 'Bob');
        mockedDb.like.findUnique = jest.fn().mockResolvedValue(null);
        mockedDb.like.create = jest.fn().mockResolvedValue({ id: 'like-1' });
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-1',
            user: { role: 'user', email: 'alice@test.com', name: 'Alice' },
        });
        mockedDb.notification.create = jest.fn();

        const result = await toggleLike(postId, 'Like');
        expect(result).toEqual({ liked: true, reactionType: 'Like' });
        expect(mockedDb.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: 'LIKE',
                    message: 'Bob liked your post',
                    userId: 'user-1',
                }),
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'alice@test.com', notificationType: 'LIKE' })
        );
        expect(mockedNotifyAdmins).toHaveBeenCalled();
    });

    it('removes like if same reaction exists', async () => {
        mockSession('user-2');
        mockedDb.like.findUnique = jest.fn().mockResolvedValue({
            id: 'like-1',
            reactionType: 'Like',
        });
        mockedDb.like.delete = jest.fn().mockResolvedValue(undefined);

        const result = await toggleLike(postId, 'Like');
        expect(result).toEqual({ liked: false, reactionType: null });
        expect(mockedDb.like.delete).toHaveBeenCalled();
    });

    it('updates reaction if different', async () => {
        mockSession('user-2');
        mockedDb.like.findUnique = jest.fn().mockResolvedValue({
            id: 'like-1',
            reactionType: 'Like',
        });
        mockedDb.like.update = jest.fn().mockResolvedValue(undefined);

        const result = await toggleLike(postId, 'Dislike');
        expect(result).toEqual({ liked: true, reactionType: 'Dislike' });
        expect(mockedDb.like.update).toHaveBeenCalledWith({
            where: { id: 'like-1' },
            data: { reactionType: 'Dislike' },
        });
    });

    it('does not notify admins if post is by admin', async () => {
        mockSession('user-2', 'Bob');
        mockedDb.like.findUnique = jest.fn().mockResolvedValue(null);
        mockedDb.like.create = jest.fn().mockResolvedValue({});
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({
            userId: 'admin-1',
            user: { role: 'admin', email: 'admin@test.com', name: 'Admin' },
        });
        mockedDb.notification.create = jest.fn();

        await toggleLike(postId, 'Like');
        expect(mockedNotifyAdmins).not.toHaveBeenCalled();
    });
});

// ── addComment ────────────────────────────────────────────────────────

describe('addComment', () => {
    it('throws if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(addComment('p1', 'Nice')).rejects.toThrow('Unauthorized');
    });

    it('creates comment and notifies post owner and parent', async () => {
        mockSession('user-2', 'Bob');
        const comment = {
            id: 'c1',
            content: 'Nice',
            user: { id: 'user-2', name: 'Bob', image: null, role: 'user' },
        };
        mockedDb.comment.create = jest.fn().mockResolvedValue(comment);
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-1',
            user: { role: 'user', email: 'alice@test.com', name: 'Alice' },
        });
        mockedDb.comment.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-3',
            postId: 'p1',
            deleted: false,
            user: { email: 'parent@test.com', name: 'ParentUser' },
        });
        mockedDb.user.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.notification.create = jest.fn();
        mockedDb.notification.createMany = jest.fn();

        await addComment('p1', 'Nice', 'parent-1');

        expect(mockedDb.notification.create).toHaveBeenCalledTimes(2);
        expect(
            (mockedDb.notification.create as jest.Mock).mock.calls[0][0]
        ).toEqual(
            expect.objectContaining({
                data: expect.objectContaining({ userId: 'user-1' }),
            })
        );
        expect(
            (mockedDb.notification.create as jest.Mock).mock.calls[1][0]
        ).toEqual(
            expect.objectContaining({
                data: expect.objectContaining({ userId: 'user-3' }),
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledTimes(2);
        expect(mockedNotifyAdmins).toHaveBeenCalled();
    });

    it('creates mention notifications from comment content', async () => {
        mockSession('user-2', 'Bob');
        mockedDb.comment.create = jest.fn().mockResolvedValue({
            id: 'c2',
            content: 'Hey @Dave',
            user: { id: 'user-2', name: 'Bob', image: null, role: 'user' },
        });
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-2',
            user: { role: 'user', email: 'bob@test.com', name: 'Bob' },
        });
        mockedDb.comment.findUnique = jest.fn().mockResolvedValue(null);
        mockedDb.user.findMany = jest.fn().mockResolvedValue([
            { id: 'dave-id', name: 'Dave', email: 'dave@test.com' },
        ]);
        mockedDb.notification.create = jest.fn();
        mockedDb.notification.createMany = jest.fn();

        await addComment('p1', 'Hey @Dave');

        expect(mockedDb.notification.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({
                    type: 'MENTION',
                    message: 'Bob mentioned you in a comment',
                    userId: 'dave-id',
                }),
            ]),
        });
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'dave@test.com', notificationType: 'MENTION' })
        );
    });

    it('rejects comments when the post is closed', async () => {
        mockSession('user-2');
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({
            deleted: false,
            commentsEnabled: false,
            userId: 'user-1',
            user: { role: 'user' },
        });
        mockedDb.comment.create = jest.fn();

        await expect(addComment('p1', 'No')).rejects.toThrow('Comments are closed');
        expect(mockedDb.comment.create).not.toHaveBeenCalled();
    });

    it('rejects a parent comment from a different post', async () => {
        mockSession('user-2');
        mockedDb.comment.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-3',
            postId: 'other-post',
            deleted: false,
            user: { email: null, name: 'Other' },
        });

        await expect(addComment('p1', 'No', 'c1')).rejects.toThrow(
            'Invalid parent comment',
        );
    });
});

// ── getPostComments ───────────────────────────────────────────────────

describe('getPostComments', () => {
    it('fetches comments with nested replies', async () => {
        const mockComments = [
            {
                id: 'c1',
                content: 'Parent',
                user: mockUser('u1', 'Alice'),
                _count: { commentLikes: 1, replies: 1 },
                commentLikes: [{ userId: 'u2', isDislike: false, reactionType: 'Like' }],
                replies: [
                    {
                        id: 'r1',
                        content: 'Child',
                        user: mockUser('u2', 'Bob'),
                        _count: { commentLikes: 0 },
                        commentLikes: [],
                    },
                ],
            },
        ];
        mockedDb.comment.findMany = jest.fn().mockResolvedValue(mockComments);

        const comments = await getPostComments('p1');
        expect(comments).toHaveLength(1);
        expect(comments[0].replies).toHaveLength(1);
    });
});

// ── deletePost ────────────────────────────────────────────────────────

describe('deletePost', () => {
    it('throws if post not found', async () => {
        mockSession();
        mockedDb.post.findUnique = jest.fn().mockResolvedValue(null);
        await expect(deletePost('p1')).rejects.toThrow('Post not found');
    });

    it('allows owner to delete', async () => {
        mockSession('user-1');
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.post.update = jest.fn().mockResolvedValue(undefined);

        const result = await deletePost('p1');
        expect(result.success).toBe(true);
        expect(mockedDb.post.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'p1' }, data: { deleted: true } })
        );
    });

    it('allows admin to delete', async () => {
        mockSession('admin-id');
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({
            userId: 'other-user',
            user: { role: 'user' },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.post.update = jest.fn().mockResolvedValue(undefined);
        await deletePost('p1');
        expect(mockedDb.post.update).toHaveBeenCalled();
    });

    it('throws Forbidden for non-owner non-admin', async () => {
        mockSession('user-2');
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-1',
            user: { role: 'user' },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        await expect(deletePost('p1')).rejects.toThrow('Forbidden');
    });

    it('prevents an admin from deleting a superadmin post', async () => {
        mockSession('admin-id');
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({
            userId: 'super-id',
            deleted: false,
            user: { role: 'superadmin' },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.post.update = jest.fn();

        await expect(deletePost('p1')).rejects.toThrow('Forbidden');
        expect(mockedDb.post.update).not.toHaveBeenCalled();
    });
});

// ── updatePost ────────────────────────────────────────────────────────

describe('updatePost', () => {
    it('updates if owner', async () => {
        mockSession('user-1');
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.post.update = jest
            .fn()
            .mockResolvedValue({ id: 'p1', content: 'Updated' });
        await updatePost('p1', { content: 'Updated', tags: ['new'] });
        expect(mockedDb.post.update).toHaveBeenCalledWith({
            where: { id: 'p1' },
            data: { content: 'Updated', tags: ['new'] },
        });
    });

    it('throws Forbidden if not owner', async () => {
        mockSession('user-2');
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        await expect(updatePost('p1', { content: 'No' })).rejects.toThrow('Forbidden');
    });
});

// ── togglePostComments ────────────────────────────────────────────────

describe('togglePostComments', () => {
    it('toggles commentsEnabled and returns new value', async () => {
        mockSession('user-1');
        mockedDb.post.findUnique = jest
            .fn()
            .mockResolvedValue({ userId: 'user-1', commentsEnabled: true });
        mockedDb.post.update = jest.fn().mockResolvedValue({ commentsEnabled: false });

        const result = await togglePostComments('p1');
        expect(result.commentsEnabled).toBe(false);
        expect(mockedDb.post.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { commentsEnabled: false } })
        );
    });

    it('throws if not owner', async () => {
        mockSession('user-2');
        mockedDb.post.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        await expect(togglePostComments('p1')).rejects.toThrow('Forbidden');
    });
});

// ── getUserActivity ───────────────────────────────────────────────────

describe('getUserActivity', () => {
    it('aggregates posts, comments, likes and returns sorted', async () => {
        mockedDb.post.findMany = jest.fn().mockResolvedValue([
            { id: 'p1', content: 'Post content', createdAt: new Date('2024-01-02') },
        ]);
        mockedDb.comment.findMany = jest.fn().mockResolvedValue([
            {
                id: 'c1',
                content: 'Comment',
                createdAt: new Date('2024-01-01'),
                post: { id: 'p1', content: 'Post' },
            },
        ]);
        mockedDb.like.findMany = jest.fn().mockResolvedValue([
            {
                id: 'l1',
                reactionType: 'Like',
                createdAt: new Date('2024-01-03'),
                post: { id: 'p1', content: 'Post' },
            },
        ]);

        const activities = await getUserActivity('user-1', 5);
        expect(activities).toHaveLength(3);
        expect(activities[0].type).toBe('reaction');
        expect(activities[1].type).toBe('post');
        expect(activities[2].type).toBe('comment');
    });

    it('returns empty array on error', async () => {
        mockedDb.post.findMany = jest.fn().mockRejectedValue(new Error('fail'));
        mockedDb.comment.findMany = jest.fn().mockResolvedValue([]);
        mockedDb.like.findMany = jest.fn().mockResolvedValue([]);

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        expect(await getUserActivity('user-1')).toEqual([]);
        consoleErrorSpy.mockRestore();
    });

    it('prevents ordinary users from reading another user activity', async () => {
        mockSession('user-1');
        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'user' })
            .mockResolvedValueOnce({ role: 'user' });
        mockedDb.post.findMany = jest.fn();

        await expect(getUserActivity('user-2')).rejects.toThrow('Forbidden');
        expect(mockedDb.post.findMany).not.toHaveBeenCalled();
    });

    it('prevents an admin from reading superadmin activity', async () => {
        mockSession('admin-1');
        mockedDb.user.findUnique = jest
            .fn()
            .mockResolvedValueOnce({ role: 'admin' })
            .mockResolvedValueOnce({ role: 'superadmin' });
        mockedDb.post.findMany = jest.fn();

        await expect(getUserActivity('superadmin-1')).rejects.toThrow('Forbidden');
        expect(mockedDb.post.findMany).not.toHaveBeenCalled();
    });
});

// ── toggleCommentLike ─────────────────────────────────────────────────

describe('toggleCommentLike', () => {
    const commentId = 'c1';

    it('throws if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        await expect(toggleCommentLike(commentId)).rejects.toThrow('Unauthorized');
    });

    it('removes like if same reaction exists', async () => {
        mockSession('user-2');
        mockedDb.commentLike.findUnique = jest
            .fn()
            .mockResolvedValue({ id: 'cl1', reactionType: 'Like' });
        mockedDb.commentLike.delete = jest.fn().mockResolvedValue(undefined);

        const result = await toggleCommentLike(commentId, false, 'Like');
        expect(result).toEqual({ action: 'removed', reactionType: null });
    });

    it('creates like and notifies comment owner', async () => {
        mockSession('user-2', 'Bob');
        mockedDb.commentLike.findUnique = jest.fn().mockResolvedValue(null);
        mockedDb.commentLike.create = jest.fn().mockResolvedValue({});
        mockedDb.comment.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-1',
            user: { email: 'alice@test.com', name: 'Alice' },
        });
        mockedDb.notification.create = jest.fn();

        const result = await toggleCommentLike(commentId, false, 'Like');
        expect(result).toEqual({ action: 'reacted', reactionType: 'Like' });
        expect(mockedDb.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: 'LIKE',
                    message: 'Bob liked your comment',
                    userId: 'user-1',
                }),
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalled();
    });

    it('updates reaction if different', async () => {
        mockSession('user-2');
        mockedDb.commentLike.findUnique = jest
            .fn()
            .mockResolvedValue({ id: 'cl1', reactionType: 'Like' });
        mockedDb.commentLike.update = jest.fn().mockResolvedValue({});

        const result = await toggleCommentLike(commentId, false, 'Heart');
        expect(result).toEqual({ action: 'reacted', reactionType: 'Heart' });
        expect(mockedDb.commentLike.update).toHaveBeenCalledWith({
            where: { id: 'cl1' },
            data: { reactionType: 'Heart', isDislike: false },
        });
    });
});

// ── editComment ───────────────────────────────────────────────────────

describe('editComment', () => {
    it('edits own comment', async () => {
        mockSession('user-1');
        mockedDb.comment.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-1',
            post: { deleted: false },
            user: { role: 'user' },
        });
        mockedDb.comment.update = jest
            .fn()
            .mockResolvedValue({ id: 'c1', content: 'new' });
        const result = await editComment('c1', 'new');
        expect(result).toHaveProperty('content', 'new');
    });

    it('throws if not owner', async () => {
        mockSession('user-2');
        mockedDb.comment.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        await expect(editComment('c1', 'new')).rejects.toThrow('Forbidden');
    });
});

// ── deleteComment ─────────────────────────────────────────────────────

describe('deleteComment', () => {
    it('allows owner to delete', async () => {
        mockSession('user-1');
        mockedDb.comment.findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        mockedDb.comment.update = jest.fn().mockResolvedValue({});
        const result = await deleteComment('c1');
        expect(result.success).toBe(true);
    });

    it('allows admin to delete', async () => {
        mockSession('admin-id');
        mockedDb.comment.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-2',
            post: { deleted: false },
            user: { role: 'user' },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'admin' });
        mockedDb.comment.update = jest.fn().mockResolvedValue({});
        await deleteComment('c1');
        expect(mockedDb.comment.update).toHaveBeenCalled();
    });

    it('throws Forbidden for non-owner non-admin', async () => {
        mockSession('user-3');
        mockedDb.comment.findUnique = jest.fn().mockResolvedValue({
            userId: 'user-2',
            post: { deleted: false },
            user: { role: 'user' },
        });
        mockedDb.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        await expect(deleteComment('c1')).rejects.toThrow('Forbidden');
    });
});

// ── searchUsers ───────────────────────────────────────────────────────

describe('searchUsers', () => {
    it('returns matching users excluding current', async () => {
        mockSession('user-1');
        mockedDb.user.findMany = jest
            .fn()
            .mockResolvedValue([{ id: 'user-2', name: 'Bob', image: null }]);

        const users = await searchUsers('Bob');
        expect(users).toHaveLength(1);
        expect(mockedDb.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    name: { contains: 'Bob', mode: 'insensitive' },
                    id: { not: 'user-1' },
                    banned: { not: true },
                },
            })
        );
    });

    it('returns empty if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);
        expect(await searchUsers('Bob')).toEqual([]);
    });
});

// ── getAllUsers ───────────────────────────────────────────────────────

describe('getAllUsers', () => {
    it('returns users excluding banned and current user', async () => {
        mockSession('user-1');
        mockedDb.user.findMany = jest
            .fn()
            .mockResolvedValue([{ id: 'user-2', name: 'Alice', image: null }]);

        const users = await getAllUsers();
        expect(users).toHaveLength(1);
        expect(mockedDb.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { not: 'user-1' }, banned: { not: true } },
            })
        );
    });
});

// ── getPostLikers ─────────────────────────────────────────────────────

describe('getPostLikers', () => {
    it('returns users who liked the post with their reaction', async () => {
        mockSession();
        mockedDb.like.findMany = jest.fn().mockResolvedValue([
            {
                user: { id: 'u2', name: 'Bob', image: null },
                reactionType: 'Like',
            },
        ]);
        const likers = await getPostLikers('p1');
        expect(likers).toEqual([
            { id: 'u2', name: 'Bob', image: null, reactionType: 'Like' },
        ]);
    });
});

import {
    createTopic,
    getTopics,
    getTopicWithReplies,
    addReply,
    getCommunityUsers,
    deleteTopic,
    deleteReply,
    editReply,
    editTopic,
    toggleTopicLike,
    toggleTopicChat,
    voteOnPoll,
} from '@/app/actions/community';

jest.mock('@/lib/auth-utils', () => ({ authSession: jest.fn() }));
jest.mock('@/lib/db', () => ({
    db: {
        communityTopic: {},
        communityReply: {},
        communityTopicLike: {},
        user: {},
        notification: {},
        auditLog: {},
    },
}));
jest.mock('@/lib/notify-admins', () => ({
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/send-notification-email', () => ({
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const { authSession } = require('@/lib/auth-utils');
const { db } = require('@/lib/db');
const { notifyAdmins } = require('@/lib/notify-admins');
const { sendNotificationEmail } = require('@/lib/send-notification-email');

// Helper to set up admin session
function mockAdminSession(role: 'admin' | 'superadmin' = 'admin') {
    authSession.mockResolvedValue({ user: { id: 'admin-1', name: 'Admin' } });
    db.user.findUnique = jest.fn().mockResolvedValue({ role });
}

beforeEach(() => {
    jest.clearAllMocks();
    db.communityTopic = {};
    db.communityReply = {};
    db.communityTopicLike = {};
    db.user = {};
    db.notification = {};
    db.auditLog = {};
});

describe('createTopic', () => {
    it('throws for non-admin', async () => {
        authSession.mockResolvedValue({ user: { id: 'user-1' } });
        db.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        await expect(createTopic({ title: 'T', content: 'C', category: 'General' }))
            .rejects.toThrow('Only admins');
    });

    it('creates topic and sends announcements notifications', async () => {
        mockAdminSession();
        const now = new Date();
        db.communityTopic.create = jest.fn().mockResolvedValue({
            id: 't1', title: 'Important', category: 'Announcements', createdAt: now,
        });
        // For announcement: find all users
        db.user.findMany = jest.fn().mockResolvedValue([
            { id: 'u1', email: 'u1@test.com', name: 'User1' },
            { id: 'u2', email: 'u2@test.com', name: 'User2' },
        ]);
        db.notification.createMany = jest.fn();

        await createTopic({ title: 'Important', content: 'Msg', category: 'Announcements' });

        expect(db.notification.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({
                    type: 'ANNOUNCEMENT',
                    message: 'New announcement: Important',
                    link: '/community',
                    userId: 'u1',
                }),
                expect.objectContaining({
                    type: 'ANNOUNCEMENT',
                    message: 'New announcement: Important',
                    link: '/community',
                    userId: 'u2',
                }),
            ]),
        });
        expect(sendNotificationEmail).toHaveBeenCalledTimes(2);
    });

    it('does not send notifications for non-announcements', async () => {
        mockAdminSession();
        db.communityTopic.create = jest.fn().mockResolvedValue({ id: 't2' });
        db.user.findMany = jest.fn(); // should not be called
        db.notification.createMany = jest.fn();

        await createTopic({ title: 'General', content: 'Msg', category: 'General' });
        expect(db.user.findMany).not.toHaveBeenCalled();
        expect(db.notification.createMany).not.toHaveBeenCalled();
    });
});

describe('getTopics', () => {
    it('returns paginated topics', async () => {
        db.communityTopic.findMany = jest.fn().mockResolvedValue([{ id: 't1', title: 'Test' }]);
        db.communityTopic.count = jest.fn().mockResolvedValue(1);

        const result = await getTopics();
        expect(result.topics).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.pages).toBe(1);
    });

    it('filters by category', async () => {
        db.communityTopic.findMany = jest.fn().mockResolvedValue([]);
        db.communityTopic.count = jest.fn().mockResolvedValue(0);

        await getTopics('Announcements');
        expect(db.communityTopic.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { deleted: false, category: 'Announcements' },
            })
        );
    });

    it('returns empty on error', async () => {
        db.communityTopic.findMany = jest.fn().mockRejectedValue(new Error('fail'));
        db.communityTopic.count = jest.fn().mockResolvedValue(0);
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await getTopics();
        expect(result).toEqual({ topics: [], total: 0, pages: 0 });
        jest.restoreAllMocks();
    });
});

describe('getTopicWithReplies', () => {
    it('returns topic with nested replies', async () => {
        db.communityTopic.findUnique = jest.fn().mockResolvedValue({
            id: 't1', title: 'Topic', replies: [], likes: [],
        });

        const topic = await getTopicWithReplies('t1');
        expect(topic).toHaveProperty('id', 't1');
    });
});

describe('addReply', () => {
    it('throws for non-admin', async () => {
        authSession.mockResolvedValue({ user: { id: 'user-1' } });
        db.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        await expect(addReply({ topicId: 't1', content: 'test' }))
            .rejects.toThrow('Only admins');
    });

    it('creates reply and sends notifications', async () => {
        mockAdminSession();
        db.communityReply.create = jest.fn().mockResolvedValue({ id: 'r1' });
        // No mentions or parent
        db.user.findMany = jest.fn().mockResolvedValue([]);
        db.notification.createMany = jest.fn();
        db.notification.create = jest.fn(); // might not be used directly, but just in case

        await addReply({ topicId: 't1', content: 'Reply' });

        expect(db.communityReply.create).toHaveBeenCalled();
        // Should attempt admin notification
        expect(notifyAdmins).toHaveBeenCalled();
    });

    it('notifies mentioned users and parent reply owner', async () => {
        mockAdminSession();
        db.communityReply.create = jest.fn().mockResolvedValue({ id: 'r2' });
        db.user.findMany = jest.fn()
            .mockResolvedValueOnce([{ id: 'u2', email: 'u2@test.com', name: 'User2' }]) // mentioned
            .mockResolvedValueOnce([]); // second call for? Actually the code has two findMany: one for mentioned, one for parent lookup? It's actually for parent reply user info.
        // But we need to mock the parent reply lookup
        db.communityReply.findUnique = jest.fn().mockResolvedValue({
            userId: 'u3',
            user: { email: 'u3@test.com', name: 'User3' },
        });
        db.notification.createMany = jest.fn();

        await addReply({ topicId: 't1', content: 'Hey @User2', parentId: 'parent-1' });

        expect(db.notification.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ userId: 'u2', type: 'MENTION' }),
                expect.objectContaining({ userId: 'u3', type: 'COMMENT' }),
            ]),
        });
        expect(sendNotificationEmail).toHaveBeenCalled();
    });
});

describe('deleteTopic', () => {
    it('allows admin to delete', async () => {
        mockAdminSession();
        db.communityTopic.update = jest.fn();
        db.auditLog.create = jest.fn();
        await deleteTopic('t1');
        expect(db.communityTopic.update).toHaveBeenCalledWith({
            where: { id: 't1' },
            data: { deleted: true },
        });
    });
});

describe('deleteReply', () => {
    it('allows admin to delete any reply', async () => {
        mockAdminSession();
        db.communityReply.findUnique = jest.fn().mockResolvedValue({ userId: 'other' });
        db.communityReply.update = jest.fn();
        db.auditLog.create = jest.fn();
        await deleteReply('r1');
        expect(db.communityReply.update).toHaveBeenCalledWith({
            where: { id: 'r1' },
            data: { deleted: true },
        });
    });

    it('allows owner to delete own reply', async () => {
        authSession.mockResolvedValue({ user: { id: 'user-2' } });
        db.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        db.communityReply.findUnique = jest.fn().mockResolvedValue({ userId: 'user-2' });
        db.communityReply.update = jest.fn();
        db.auditLog.create = jest.fn();
        await deleteReply('r2');
        expect(db.communityReply.update).toHaveBeenCalled();
    });

    it('throws forbidden for non-owner non-admin', async () => {
        authSession.mockResolvedValue({ user: { id: 'user-3' } });
        db.user.findUnique = jest.fn().mockResolvedValue({ role: 'user' });
        db.communityReply.findUnique = jest.fn().mockResolvedValue({ userId: 'other' });
        await expect(deleteReply('r3')).rejects.toThrow('Forbidden');
    });
});

describe('editReply', () => {
    it('edits own reply', async () => {
        mockAdminSession();
        db.communityReply.findUnique = jest.fn().mockResolvedValue({ userId: 'admin-1' });
        db.communityReply.update = jest.fn().mockResolvedValue({ id: 'r1', content: 'new' });
        const result = await editReply('r1', 'new');
        expect(result).toHaveProperty('content', 'new');
    });
});

describe('toggleTopicLike', () => {
    it('toggles like', async () => {
        mockAdminSession();
        db.communityTopicLike.findUnique = jest.fn().mockResolvedValue(null);
        db.communityTopicLike.create = jest.fn().mockResolvedValue({});
        const result = await toggleTopicLike('t1', false);
        expect(result.action).toBe('liked');
    });
});

describe('voteOnPoll', () => {
    it('votes and toggles', async () => {
        mockAdminSession();
        db.communityReply.findUnique = jest.fn().mockResolvedValue({
            pollOptions: ['A', 'B'],
            pollVotes: {},
        });
        db.communityReply.update = jest.fn().mockResolvedValue({});
        const result = await voteOnPoll('r1', 0);
        expect(result.success).toBe(true);
    });
});

describe('getCommunityUsers', () => {
    it('returns non-banned users', async () => {
        db.user.findMany = jest.fn().mockResolvedValue([{ id: 'u1', name: 'Alice' }]);
        const users = await getCommunityUsers();
        expect(users).toHaveLength(1);
    });

    it('returns empty on error', async () => {
        db.user.findMany = jest.fn().mockRejectedValue(new Error('fail'));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(await getCommunityUsers()).toEqual([]);
        jest.restoreAllMocks();
    });
});
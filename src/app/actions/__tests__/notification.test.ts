/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('@/lib/auth-utils', () => ({
    verifiedAuthSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        notification: {},
    },
}));

import { verifiedAuthSession as _verifiedAuthSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';
import type { verifiedAuthSession } from '@/lib/auth-utils';

import {
    getUnreadNotificationCount,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from '@/app/actions/notification';


const mockedVerifiedAuthSession = _verifiedAuthSession as jest.MockedFunction<typeof verifiedAuthSession>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    notification: MockTable;
}

const mockedDb = _db as unknown as MockDb;

function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.notification = mockedDb.notification;
}

function mockSession(userId = 'user-1', name = 'Test User'): void {
    mockedVerifiedAuthSession.mockResolvedValue({
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, '')}@test.com`,
            role: 'user',
        },
    } as Awaited<ReturnType<typeof verifiedAuthSession>>);
}

beforeEach(() => {
    jest.clearAllMocks();

    // FIX 2: Initialize notification table with all necessary mocks
    mockedDb.notification = {
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    };

    syncDb();
});

describe('getUnreadNotificationCount', () => {
    it('returns 0 when not authenticated (no throw)', async () => {
        // Mock rejected value to simulate unauthorized access properly
        mockedVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));

        const result = await getUnreadNotificationCount();

        expect(result).toBe(0);
        // notification.count must never be called when unauthenticated
        expect(mockedDb.notification.count).not.toHaveBeenCalled();
    });

    it('returns the unread count for the authenticated user', async () => {
        mockSession('user-1');
        mockedDb.notification.count.mockResolvedValue(7);
        syncDb();

        const result = await getUnreadNotificationCount();

        expect(result).toBe(7);
        expect(mockedDb.notification.count).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-1', read: false },
            })
        );
    });

    it('returns 0 when there are no unread notifications', async () => {
        mockSession('user-1');
        mockedDb.notification.count.mockResolvedValue(0);
        syncDb();

        const result = await getUnreadNotificationCount();

        expect(result).toBe(0);
    });

    it('returns 0 and does not throw when the database errors', async () => {
        mockSession('user-1');
        mockedDb.notification.count.mockRejectedValue(new Error('DB error'));
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const result = await getUnreadNotificationCount();

        expect(result).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it('scopes the count query to the authenticated user', async () => {
        mockSession('user-99');
        mockedDb.notification.count.mockResolvedValue(3);
        syncDb();

        await getUnreadNotificationCount();

        expect(mockedDb.notification.count).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-99' }),
            })
        );
    });
});

describe('getNotifications', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));

        await expect(getNotifications()).rejects.toThrow('Unauthorized');
    });

    it('returns paginated notifications with counts', async () => {
        mockSession('user-1');

        const fakeNotifications = [
            { id: 'n1', message: 'Hello', read: false, createdAt: new Date() },
            { id: 'n2', message: 'World', read: true, createdAt: new Date() },
        ];

        mockedDb.notification.findMany.mockResolvedValue(fakeNotifications);
        // Three count calls in Promise.all: total, unread
        mockedDb.notification.count
            .mockResolvedValueOnce(20)  // total
            .mockResolvedValueOnce(5);  // unreadCount
        syncDb();

        const result = await getNotifications(1, 10);

        expect(result.notifications).toHaveLength(2);
        expect(result.total).toBe(20);
        expect(result.unreadCount).toBe(5);
        expect(result.pages).toBe(2); // Math.ceil(20 / 10)
    });

    it('queries notifications scoped to the authenticated user', async () => {
        mockSession('user-42');

        mockedDb.notification.findMany.mockResolvedValue([]);
        mockedDb.notification.count.mockResolvedValue(0);
        syncDb();

        await getNotifications();

        expect(mockedDb.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-42' },
            })
        );
    });

    it('applies correct pagination (skip / take) for page 2 with limit 5', async () => {
        mockSession('user-1');

        mockedDb.notification.findMany.mockResolvedValue([]);
        mockedDb.notification.count.mockResolvedValue(0);
        syncDb();

        await getNotifications(2, 5);

        expect(mockedDb.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 5,
                take: 5,
            })
        );
    });

    it('orders results by createdAt descending', async () => {
        mockSession('user-1');

        mockedDb.notification.findMany.mockResolvedValue([]);
        mockedDb.notification.count.mockResolvedValue(0);
        syncDb();

        await getNotifications();

        expect(mockedDb.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { createdAt: 'desc' },
            })
        );
    });

    it('calculates pages correctly using Math.ceil', async () => {
        mockSession('user-1');

        mockedDb.notification.findMany.mockResolvedValue([]);
        mockedDb.notification.count
            .mockResolvedValueOnce(25)  // total
            .mockResolvedValueOnce(0);  // unreadCount
        syncDb();

        const result = await getNotifications(1, 10);

        expect(result.pages).toBe(3); // Math.ceil(25 / 10)
    });

    it('returns empty result without throwing on database error', async () => {
        mockSession('user-1');

        mockedDb.notification.findMany
            .mockRejectedValue(new Error('DB failure'));
        mockedDb.notification.count.mockResolvedValue(0);
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const result = await getNotifications();

        expect(result).toEqual({
            notifications: [],
            total: 0,
            unreadCount: 0,
            pages: 0,
        });
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it('uses page 1 and limit 20 as defaults', async () => {
        mockSession('user-1');

        mockedDb.notification.findMany.mockResolvedValue([]);
        mockedDb.notification.count.mockResolvedValue(0);
        syncDb();

        await getNotifications();

        expect(mockedDb.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 0,   // (1 - 1) * 20
                take: 20,
            })
        );
    });
});

describe('markNotificationRead', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));

        await expect(markNotificationRead('notif-1')).rejects.toThrow('Unauthorized');
    });

    it('updates the notification to read: true', async () => {
        mockSession('user-1');

        mockedDb.notification.update.mockResolvedValue({
            id: 'notif-1',
            read: true,
        });
        syncDb();

        const result = await markNotificationRead('notif-1');

        expect(result).toHaveProperty('read', true);
        expect(mockedDb.notification.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'notif-1', userId: 'user-1' },
                data: { read: true },
            })
        );
    });

    it('scopes the update to the authenticated user to prevent unauthorised access', async () => {
        mockSession('user-99');

        mockedDb.notification.update.mockResolvedValue({
            id: 'notif-5',
            read: true,
        });
        syncDb();

        await markNotificationRead('notif-5');

        expect(mockedDb.notification.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-99' }),
            })
        );
    });

    it('propagates database errors to the caller', async () => {
        mockSession('user-1');

        mockedDb.notification.update
            .mockRejectedValue(new Error('Record not found'));
        syncDb();

        await expect(markNotificationRead('notif-missing')).rejects.toThrow(
            'Record not found'
        );
    });
});

describe('markAllNotificationsRead', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedVerifiedAuthSession.mockRejectedValue(new Error('Unauthorized'));

        await expect(markAllNotificationsRead()).rejects.toThrow('Unauthorized');
    });

    it('marks all unread notifications as read for the authenticated user', async () => {
        mockSession('user-1');

        mockedDb.notification.updateMany.mockResolvedValue({ count: 4 });
        syncDb();

        const result = await markAllNotificationsRead();

        expect(result).toEqual({ count: 4 });
        expect(mockedDb.notification.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-1', read: false },
                data: { read: true },
            })
        );
    });

    it('scopes the update to only unread notifications', async () => {
        mockSession('user-1');

        mockedDb.notification.updateMany.mockResolvedValue({ count: 0 });
        syncDb();

        await markAllNotificationsRead();

        expect(mockedDb.notification.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ read: false }),
            })
        );
    });

    it('scopes the update to the authenticated user', async () => {
        mockSession('user-77');

        mockedDb.notification.updateMany.mockResolvedValue({ count: 2 });
        syncDb();

        await markAllNotificationsRead();

        expect(mockedDb.notification.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-77' }),
            })
        );
    });

    it('returns count 0 when there are no unread notifications', async () => {
        mockSession('user-1');

        mockedDb.notification.updateMany.mockResolvedValue({ count: 0 });
        syncDb();

        const result = await markAllNotificationsRead();

        expect(result).toEqual({ count: 0 });
    });

    it('propagates database errors to the caller', async () => {
        mockSession('user-1');

        mockedDb.notification.updateMany
            .mockRejectedValue(new Error('Connection timeout'));
        syncDb();

        await expect(markAllNotificationsRead()).rejects.toThrow('Connection timeout');
    });
});
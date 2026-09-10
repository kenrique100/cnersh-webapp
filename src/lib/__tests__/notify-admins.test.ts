import { db } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/send-notification-email';
import * as Sentry from '@sentry/nextjs';
import { notifyAdmins } from '@/lib/notify-admins';

jest.mock('@/lib/db', () => ({
    db: {
        user: { findMany: jest.fn() },
        notification: { createMany: jest.fn() },
    },
}));

jest.mock('@/lib/send-notification-email', () => ({
    sendNotificationEmail: jest.fn(),
}));

jest.mock('@sentry/nextjs', () => ({
    startSpan: jest.fn((_: unknown, cb: () => unknown) => cb()),
}));

const mockedDb = jest.mocked(db);
const mockedSendNotificationEmail = jest.mocked(sendNotificationEmail);
const mockedStartSpan = jest.mocked(Sentry.startSpan);

type AdminUser = {
    id: string;
    email: string;
    name: string;
};


describe('notifyAdmins', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedSendNotificationEmail.mockResolvedValue(undefined);
        mockedDb.notification.createMany.mockResolvedValue({ count: 1 });
    });

    it('returns early when no admins found', async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([]);

        await notifyAdmins({ type: 'SYSTEM', message: 'Hello' });

        expect(mockedDb.notification.createMany).not.toHaveBeenCalled();
        expect(mockedSendNotificationEmail).not.toHaveBeenCalled();
    });

    it('queries admins with correct filter', async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([]);

        await notifyAdmins({ type: 'SYSTEM', message: 'Hello' });

        expect(mockedDb.user.findMany).toHaveBeenCalledWith({
            where: {
                role: { in: ['admin', 'superadmin'] },
                banned: { not: true },
            },
            select: { id: true, email: true, name: true },
        });
    });

    it('excludes a user when excludeUserId is provided', async () => {
        mockedDb.user.findMany.mockResolvedValueOnce([]);

        await notifyAdmins({ type: 'SYSTEM', message: 'Hello', excludeUserId: 'user-1' });

        expect(mockedDb.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ id: { not: 'user-1' } }),
            }),
        );
    });

    it('creates notifications for all admins', async () => {
        const adminUsers = [
            { id: 'admin-1', email: 'admin1@example.com', name: 'Admin One' },
            { id: 'admin-2', email: 'admin2@example.com', name: 'Admin Two' },
        ] as unknown as Awaited<ReturnType<typeof mockedDb.user.findMany>>;
        mockedDb.user.findMany.mockResolvedValueOnce(adminUsers);

        await notifyAdmins({ type: 'COMMENT', message: 'New comment', link: '/post/1' });

        expect(mockedDb.notification.createMany).toHaveBeenCalledWith({
            data: [
                { type: 'COMMENT', message: 'New comment', link: '/post/1', userId: 'admin-1' },
                { type: 'COMMENT', message: 'New comment', link: '/post/1', userId: 'admin-2' },
            ],
        });
    });

    it('sets link to null when not provided', async () => {
        const adminUsers = [
            { id: 'admin-1', email: 'admin1@example.com', name: 'Admin One' },
        ] as unknown as Awaited<ReturnType<typeof mockedDb.user.findMany>>;
        mockedDb.user.findMany.mockResolvedValueOnce(adminUsers);

        await notifyAdmins({ type: 'SYSTEM', message: 'Hello' });

        expect(mockedDb.notification.createMany).toHaveBeenCalledWith({
            data: [{ type: 'SYSTEM', message: 'Hello', link: null, userId: 'admin-1' }],
        });
    });

    it('sends notification emails to admins with email', async () => {
        const adminUsers = [
            { id: 'admin-1', email: 'admin1@example.com', name: 'Admin One' },
        ] as unknown as Awaited<ReturnType<typeof mockedDb.user.findMany>>;
        mockedDb.user.findMany.mockResolvedValueOnce(adminUsers);

        await notifyAdmins({ type: 'SYSTEM', message: 'Hello' });

        await new Promise(process.nextTick);

        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'admin1@example.com',
                userName: 'Admin One',
                notificationMessage: 'Hello',
                notificationType: 'SYSTEM',
            }),
        );
    });

    it('uses "Admin" as fallback when admin name is empty', async () => {
        const adminUsers = [
            { id: 'admin-1', email: 'admin1@example.com', name: '' },
        ] as unknown as Awaited<ReturnType<typeof mockedDb.user.findMany>>;
        mockedDb.user.findMany.mockResolvedValueOnce(adminUsers);

        await notifyAdmins({ type: 'SYSTEM', message: 'Hello' });

        await new Promise(process.nextTick);

        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({ userName: 'Admin' }),
        );
    });

    it('does not crash when sendNotificationEmail rejects', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const adminUsers = [
            { id: 'admin-1', email: 'admin1@example.com', name: 'Admin One' },
        ] as unknown as Awaited<ReturnType<typeof mockedDb.user.findMany>>;
        mockedDb.user.findMany.mockResolvedValueOnce(adminUsers);
        mockedSendNotificationEmail.mockRejectedValue(new Error('smtp-failed'));

        await expect(
            notifyAdmins({ type: 'SYSTEM', message: 'Hello' }),
        ).resolves.toBeUndefined();

        consoleError.mockRestore();
    });

    it('calls Sentry.startSpan for each admin email', async () => {
        const adminUsers = [
            { id: 'admin-1', email: 'admin1@example.com', name: 'Admin One' },
        ] as unknown as Awaited<ReturnType<typeof mockedDb.user.findMany>>;
        mockedDb.user.findMany.mockResolvedValueOnce(adminUsers);

        await notifyAdmins({ type: 'SYSTEM', message: 'Hello' });

        expect(mockedStartSpan).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'admin-notifications',
                op: 'queue.publish',
            }),
            expect.any(Function),
        );
    });
});
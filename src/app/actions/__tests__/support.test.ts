import type { authSession } from '@/lib/auth-utils';
import type { sendNotificationEmail as SendNotificationEmailType } from '@/lib/send-notification-email';

jest.mock('@/lib/auth-utils', () => ({
    authSession: jest.fn(),
}));

jest.mock('@/lib/send-notification-email', () => ({
    sendNotificationEmail: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        user: {},
        notification: {},
    },
}));

import { authSession as _authSession } from '@/lib/auth-utils';
import { db as _db } from '@/lib/db';
import { sendNotificationEmail as _sendNotificationEmail } from '@/lib/send-notification-email';

import { submitSupportMessage } from '@/app/actions/support';

const mockedAuthSession = _authSession as jest.MockedFunction<typeof authSession>;
const mockedSendNotificationEmail = _sendNotificationEmail as jest.MockedFunction<
    typeof SendNotificationEmailType
>;

type MockTable = Record<string, jest.Mock>;

interface MockDb {
    user: MockTable;
    notification: MockTable;
}

const mockedDb = _db as unknown as MockDb;

function syncDb(): void {
    const live = _db as unknown as MockDb;
    live.user = mockedDb.user;
    live.notification = mockedDb.notification;
}

function mockSession(
    userId = 'user-1',
    name = 'Test User',
    email = 'testuser@test.com'
): void {
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
            email,
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
 * Mocks a session where the user has no name (null).
 * Uses `unknown` cast first because better-auth types `name` as non-nullable
 * `string` on the session object, so a direct cast would be rejected by TS.
 */
function mockSessionWithNullName(
    userId = 'user-noname',
    email = 'noname@test.com'
): void {
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
            // null is not assignable to `string` in the better-auth type,
            // so we escape through unknown first.
            name: null as unknown as string,
            email,
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

const SUPER_ADMINS = [
    { id: 'super-1', email: 'super1@test.com', name: 'Super One' },
    { id: 'super-2', email: 'super2@test.com', name: 'Super Two' },
];

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.user = {};
    mockedDb.notification = {};

    syncDb();

    mockedSendNotificationEmail.mockResolvedValue(undefined);
});

// ── submitSupportMessage ──────────────────────────────────────────────

describe('submitSupportMessage', () => {
    it('throws Unauthorized if not authenticated', async () => {
        mockedAuthSession.mockResolvedValue(null);

        await expect(submitSupportMessage('Hello')).rejects.toThrow('Unauthorized');
    });

    it('throws if message is an empty string', async () => {
        mockSession();

        await expect(submitSupportMessage('')).rejects.toThrow(
            'Message cannot be empty'
        );
    });

    it('throws if message contains only whitespace', async () => {
        mockSession();

        await expect(submitSupportMessage('   ')).rejects.toThrow(
            'Message cannot be empty'
        );
    });

    it('throws if no super admin exists', async () => {
        mockSession();

        mockedDb.user.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await expect(submitSupportMessage('Need help')).rejects.toThrow(
            'No super admin available to receive your message'
        );
    });

    it('queries only non-banned superadmins', async () => {
        mockSession();

        mockedDb.user.findMany = jest.fn().mockResolvedValue(SUPER_ADMINS);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage('Need help');

        expect(mockedDb.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    role: 'superadmin',
                    banned: { not: true },
                },
                select: { id: true, email: true, name: true },
            })
        );
    });

    it('creates a SYSTEM notification for every super admin', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue(SUPER_ADMINS);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage('Need help with my protocol.');

        expect(mockedDb.notification.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'SYSTEM',
                        userId: 'super-1',
                        link: '/admin/reports',
                        message: expect.stringContaining('Alice'),
                    }),
                    expect.objectContaining({
                        type: 'SYSTEM',
                        userId: 'super-2',
                        link: '/admin/reports',
                        message: expect.stringContaining('Alice'),
                    }),
                ]),
            })
        );
    });

    it('falls back to session email in notification message when name is null', async () => {
        // Uses the dedicated helper that escapes the non-nullable `name` type
        // via `null as unknown as string` - safe at runtime because the action
        // guards against falsy name with `session.user.name || session.user.email`.
        mockSessionWithNullName('user-noname', 'noname@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage('Help');

        const callData = mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain('noname@test.com');
    });

    it('truncates the notification message to 200 characters with an ellipsis', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        const longMessage = 'A'.repeat(250);
        await submitSupportMessage(longMessage);

        const callData = mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain('A'.repeat(200) + '...');
        expect(callData.message).not.toContain('A'.repeat(201));
    });

    it('does not add ellipsis for messages at or below 200 characters', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        const exactMessage = 'B'.repeat(200);
        await submitSupportMessage(exactMessage);

        const callData = mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).not.toContain('...');
    });

    it('sends an email to each super admin', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue(SUPER_ADMINS);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage('Need assistance');

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockedSendNotificationEmail).toHaveBeenCalledTimes(2);
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'super1@test.com',
                userName: 'Super One',
                notificationType: 'SYSTEM',
                actionUrl: '/admin/reports',
                notificationMessage: expect.stringContaining('Alice'),
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'super2@test.com',
                userName: 'Super Two',
            })
        );
    });

    it('uses the full (non-truncated) message in emails', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        const longMessage = 'C'.repeat(250);
        await submitSupportMessage(longMessage);

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                notificationMessage: expect.stringContaining('C'.repeat(250)),
            })
        );
    });

    it('returns { success: true } on successful submission', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await submitSupportMessage('Please help');

        expect(result).toEqual({ success: true });
    });

    it('trims leading and trailing whitespace from the message', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage('  trimmed message  ');

        const callData = mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain('"trimmed message"');
        expect(callData.message).not.toContain('"  trimmed message  "');
    });

    it('still returns success even if sendNotificationEmail rejects', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        mockedSendNotificationEmail.mockRejectedValue(new Error('SMTP error'));
        syncDb();

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        const result = await submitSupportMessage('Urgent help needed');

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(result).toEqual({ success: true });

        consoleErrorSpy.mockRestore();
    });

    it('sends exactly one email per super admin (no duplicates)', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([
            { id: 'super-1', email: 'super1@test.com', name: 'Super One' },
        ]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage('One email please');

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockedSendNotificationEmail).toHaveBeenCalledTimes(1);
    });

    it('creates notifications for all super admins even when there are many', async () => {
        mockSession('user-1', 'Alice');

        const manyAdmins = Array.from({ length: 5 }, (_, i) => ({
            id: `super-${i}`,
            email: `super${i}@test.com`,
            name: `Super ${i}`,
        }));

        mockedDb.user.findMany = jest.fn().mockResolvedValue(manyAdmins);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage('Broadcast message');

        const callData = mockedDb.notification.createMany.mock.calls[0][0].data;
        expect(callData).toHaveLength(5);
        callData.forEach((entry: { userId: string }) => {
            expect(entry.userId).toMatch(/^super-\d$/);
        });
    });
});
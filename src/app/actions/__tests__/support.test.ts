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

const mockCaptureMessage = jest.fn();
jest.mock('@sentry/nextjs', () => ({
    captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
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
 * A session whose user has no name (null). The action falls back to
 * the session email in that case, so this is used to verify the fallback.
 * better-auth types `name` as non-nullable, so we escape through `unknown`.
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

/** A valid input object matching the supportSchema. */
const validInput = {
    category: 'bug' as const,
    subject: 'Form crashes on submit',
    message: 'Every time I submit the support form it fails with error 500.',
};

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

        await expect(submitSupportMessage(validInput)).rejects.toThrow(
            'Unauthorized'
        );
    });

    // ── Input validation ─────────────────────────────────────────────

    it('throws when subject is shorter than 3 characters', async () => {
        mockSession();

        await expect(
            submitSupportMessage({ ...validInput, subject: 'hi' })
        ).rejects.toThrow(/subject/i);
    });

    it('throws when message is shorter than 10 characters', async () => {
        mockSession();

        await expect(
            submitSupportMessage({ ...validInput, message: 'short' })
        ).rejects.toThrow(/message/i);
    });

    it('throws when subject exceeds 200 characters', async () => {
        mockSession();

        await expect(
            submitSupportMessage({ ...validInput, subject: 'A'.repeat(201) })
        ).rejects.toThrow(/subject/i);
    });

    it('throws when message exceeds 5000 characters', async () => {
        mockSession();

        await expect(
            submitSupportMessage({ ...validInput, message: 'A'.repeat(5001) })
        ).rejects.toThrow(/message/i);
    });

    it('throws when category is not one of the allowed values', async () => {
        mockSession();

        await expect(
            submitSupportMessage({
                ...validInput,
                // @ts-expect-error - deliberately invalid category
                category: 'not-a-category',
            })
        ).rejects.toThrow();
    });

    it('throws when pageUrl is not a valid URL', async () => {
        mockSession();

        await expect(
            submitSupportMessage({ ...validInput, pageUrl: 'not a url' })
        ).rejects.toThrow();
    });

    // ── Super admin lookup ───────────────────────────────────────────

    it('throws if no super admin exists', async () => {
        mockSession();

        mockedDb.user.findMany = jest.fn().mockResolvedValue([]);
        syncDb();

        await expect(submitSupportMessage(validInput)).rejects.toThrow(
            'No super admin available to receive your message'
        );
    });

    it('queries only non-banned superadmins', async () => {
        mockSession();

        mockedDb.user.findMany = jest.fn().mockResolvedValue(SUPER_ADMINS);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage(validInput);

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

    // ── Sentry ───────────────────────────────────────────────────────

    it('captures a Sentry message tagged as coming from the support form', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage({
            ...validInput,
            pageUrl: 'https://example.com/feeds',
        });

        expect(mockCaptureMessage).toHaveBeenCalledWith(
            expect.stringContaining('[Support] bug:'),
            expect.objectContaining({
                level: 'info',
                tags: expect.objectContaining({
                    category: 'bug',
                    source: 'support-form',
                }),
                user: expect.objectContaining({
                    id: 'user-1',
                    email: 'alice@test.com',
                    username: 'Alice',
                }),
                extra: expect.objectContaining({
                    pageUrl: 'https://example.com/feeds',
                }),
            })
        );
    });

    // ── Notification payload ─────────────────────────────────────────

    it('creates a SYSTEM notification for every super admin', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue(SUPER_ADMINS);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage(validInput);

        expect(mockedDb.notification.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'SYSTEM',
                        userId: 'super-1',
                        link: '/admin/reports',
                    }),
                    expect.objectContaining({
                        type: 'SYSTEM',
                        userId: 'super-2',
                        link: '/admin/reports',
                    }),
                ]),
            })
        );
    });

    it('formats the notification with an uppercase category and the subject', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage({
            ...validInput,
            category: 'protocol',
            subject: 'Consent form question',
        });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain('[PROTOCOL]');
        expect(callData.message).toContain('Consent form question');
    });

    it('truncates the preview in the notification to 200 characters with an ellipsis', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        const longMessage = 'A'.repeat(250);
        await submitSupportMessage({ ...validInput, message: longMessage });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain('A'.repeat(200) + '...');
        expect(callData.message).not.toContain('A'.repeat(201));
    });

    it('does not add ellipsis when the message is exactly 200 characters', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        const exactMessage = 'B'.repeat(200);
        await submitSupportMessage({ ...validInput, message: exactMessage });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).not.toContain('...');
    });

    // ── Email dispatch ───────────────────────────────────────────────

    it('sends an email to each super admin', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue(SUPER_ADMINS);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage(validInput);

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockedSendNotificationEmail).toHaveBeenCalledTimes(2);
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'super1@test.com',
                userName: 'Super One',
                notificationType: 'SYSTEM',
                actionUrl: '/admin/reports',
            })
        );
        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'super2@test.com',
                userName: 'Super Two',
            })
        );
    });

    it('includes the sender, category, subject and page URL in the email body', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage({
            category: 'account',
            subject: 'Cannot reset password',
            message: 'The reset link says it has expired after a few seconds.',
            pageUrl: 'https://cnersh.cm/settings',
        });

        await new Promise((resolve) => setTimeout(resolve, 0));

        const call = mockedSendNotificationEmail.mock.calls[0][0];
        expect(call.notificationMessage).toContain('Alice');
        expect(call.notificationMessage).toContain('alice@test.com');
        expect(call.notificationMessage).toContain('Category: account');
        expect(call.notificationMessage).toContain(
            'Subject: Cannot reset password'
        );
        expect(call.notificationMessage).toContain(
            'Page: https://cnersh.cm/settings'
        );
    });

    it('falls back to "unknown" for the page URL when none is provided', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage(validInput);

        await new Promise((resolve) => setTimeout(resolve, 0));

        const call = mockedSendNotificationEmail.mock.calls[0][0];
        expect(call.notificationMessage).toContain('Page: unknown');
    });

    it('uses the full (non-truncated) message in emails', async () => {
        mockSession('user-1', 'Alice', 'alice@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        const longMessage = 'C'.repeat(250);
        await submitSupportMessage({ ...validInput, message: longMessage });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockedSendNotificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                notificationMessage: expect.stringContaining('C'.repeat(250)),
            })
        );
    });

    it('falls back to the session email in the email body when name is null', async () => {
        mockSessionWithNullName('user-noname', 'noname@test.com');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage(validInput);

        await new Promise((resolve) => setTimeout(resolve, 0));

        const call = mockedSendNotificationEmail.mock.calls[0][0];
        expect(call.notificationMessage).toContain('noname@test.com');
    });

    it('returns { success: true } on successful submission', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        const result = await submitSupportMessage(validInput);

        expect(result).toEqual({ success: true });
    });

    it('trims leading and trailing whitespace from the message', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage({
            ...validInput,
            message: '   trimmed message that is long enough   ',
        });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain('trimmed message that is long enough');
        expect(callData.message).not.toContain('   trimmed');
    });

    it('strips HTML tags from the subject and message', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([SUPER_ADMINS[0]]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage({
            ...validInput,
            subject: '<b>Important</b>',
            message: '<p>Please help <script>alert(1)</script>me quickly</p>',
        });

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data[0];
        expect(callData.message).toContain('Important');
        expect(callData.message).not.toContain('<b>');
        expect(callData.message).not.toContain('<script>');
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

        const result = await submitSupportMessage(validInput);

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(result).toEqual({ success: true });
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it('sends exactly one email per super admin (no duplicates)', async () => {
        mockSession('user-1', 'Alice');

        mockedDb.user.findMany = jest.fn().mockResolvedValue([
            { id: 'super-1', email: 'super1@test.com', name: 'Super One' },
        ]);
        mockedDb.notification.createMany = jest.fn().mockResolvedValue({});
        syncDb();

        await submitSupportMessage(validInput);

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

        await submitSupportMessage(validInput);

        const callData =
            mockedDb.notification.createMany.mock.calls[0][0].data;
        expect(callData).toHaveLength(5);
        callData.forEach((entry: { userId: string }) => {
            expect(entry.userId).toMatch(/^super-\d$/);
        });
    });
});
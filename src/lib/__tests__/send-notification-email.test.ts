const mockSendEmail_EmailsSend = jest.fn();
const mockSendEmail_ResendConstructor = jest.fn(() => ({
    emails: { send: mockSendEmail_EmailsSend },
}));

jest.mock('resend', () => ({
    Resend: mockSendEmail_ResendConstructor,
}));

jest.mock('@/emails/notification-email', () => ({
    default: () => null,
}));

describe('sendNotificationEmail', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = {
            ...originalEnv,
            RESEND_API_KEY: 'test-resend-key',
            NEXT_PUBLIC_APP_URL: 'https://app.example.com',
        };
        delete process.env.EMAIL_FROM;
        delete process.env.BETTER_AUTH_URL;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns early and warns when RESEND_API_KEY is missing', async () => {
        delete process.env.RESEND_API_KEY;
        const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const { sendNotificationEmail } = await import('@/lib/send-notification-email');

        await sendNotificationEmail({
            to: 'user@example.com',
            userName: 'Ada',
            notificationMessage: 'Hello',
            notificationType: 'SYSTEM',
        });

        expect(consoleWarn).toHaveBeenCalledWith(
            expect.stringContaining('RESEND_API_KEY'),
        );
        expect(mockSendEmail_EmailsSend).not.toHaveBeenCalled();
        consoleWarn.mockRestore();
    });

    it('sends email with correct subject and from address', async () => {
        mockSendEmail_EmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendNotificationEmail } = await import('@/lib/send-notification-email');

        await sendNotificationEmail({
            to: 'user@example.com',
            userName: 'Ada',
            notificationMessage: 'Your protocol was reviewed.',
            notificationType: 'PROJECT_STATUS',
        });

        expect(mockSendEmail_EmailsSend).toHaveBeenCalledWith(
            expect.objectContaining({
                from: 'CNERSH <info@cameroon-national-ethics-com.net>',
                to: 'user@example.com',
                subject: 'CNERSH Notification: PROJECT STATUS',
            }),
        );
    });

    it('uses EMAIL_FROM when configured', async () => {
        process.env.EMAIL_FROM = 'Custom <custom@example.com>';
        mockSendEmail_EmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendNotificationEmail } = await import('@/lib/send-notification-email');

        await sendNotificationEmail({
            to: 'user@example.com',
            userName: 'Ada',
            notificationMessage: 'Hello',
            notificationType: 'SYSTEM',
        });

        expect(mockSendEmail_EmailsSend).toHaveBeenCalledWith(
            expect.objectContaining({ from: 'Custom <custom@example.com>' }),
        );
    });

    it('builds fullActionUrl from NEXT_PUBLIC_APP_URL and actionUrl', async () => {
        mockSendEmail_EmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendNotificationEmail } = await import('@/lib/send-notification-email');

        await sendNotificationEmail({
            to: 'user@example.com',
            userName: 'Ada',
            notificationMessage: 'Hello',
            notificationType: 'SYSTEM',
            actionUrl: '/dashboard',
        });

        expect(mockSendEmail_EmailsSend).toHaveBeenCalledWith(
            expect.objectContaining({
                react: expect.anything(),
            }),
        );
    });

    it('builds fullActionUrl from BETTER_AUTH_URL when NEXT_PUBLIC_APP_URL is missing', async () => {
        delete process.env.NEXT_PUBLIC_APP_URL;
        process.env.BETTER_AUTH_URL = 'https://auth.example.com';
        mockSendEmail_EmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendNotificationEmail } = await import('@/lib/send-notification-email');

        await sendNotificationEmail({
            to: 'user@example.com',
            userName: 'Ada',
            notificationMessage: 'Hello',
            notificationType: 'SYSTEM',
            actionUrl: '/dashboard',
        });

        expect(mockSendEmail_EmailsSend).toHaveBeenCalled();
    });

    it('sends undefined fullActionUrl when actionUrl is not provided', async () => {
        mockSendEmail_EmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendNotificationEmail } = await import('@/lib/send-notification-email');

        await sendNotificationEmail({
            to: 'user@example.com',
            userName: 'Ada',
            notificationMessage: 'Hello',
            notificationType: 'SYSTEM',
        });

        expect(mockSendEmail_EmailsSend).toHaveBeenCalled();
    });

    it('swallows and logs errors thrown by Resend', async () => {
        mockSendEmail_EmailsSend.mockRejectedValueOnce(new Error('smtp-down'));
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendNotificationEmail } = await import('@/lib/send-notification-email');

        await expect(
            sendNotificationEmail({
                to: 'user@example.com',
                userName: 'Ada',
                notificationMessage: 'Hello',
                notificationType: 'SYSTEM',
            }),
        ).resolves.toBeUndefined();

        expect(consoleError).toHaveBeenCalledWith(
            'Error sending notification email:',
            expect.any(Error),
        );
        consoleError.mockRestore();
    });

    it('reuses the same Resend instance across calls', async () => {
        mockSendEmail_EmailsSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
        const { sendNotificationEmail } = await import('@/lib/send-notification-email');

        await sendNotificationEmail({ to: 'one@example.com', userName: 'One', notificationMessage: 'Hi', notificationType: 'SYSTEM' });
        await sendNotificationEmail({ to: 'two@example.com', userName: 'Two', notificationMessage: 'Hi', notificationType: 'SYSTEM' });

        expect(mockSendEmail_ResendConstructor).toHaveBeenCalledTimes(1);
    });
});
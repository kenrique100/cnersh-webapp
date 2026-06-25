const mockReset_EmailsSend = jest.fn();
const mockReset_ResendConstructor = jest.fn(() => ({
    emails: { send: mockReset_EmailsSend },
}));

jest.mock('resend', () => ({
    Resend: mockReset_ResendConstructor,
}));

jest.mock('@/emails/request-password-email', () => ({
    default: () => null,
}));

describe('sendResetPasswordEmail', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = {
            ...originalEnv,
            RESEND_API_KEY: 'test-resend-key',
        };
        delete process.env.EMAIL_FROM;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('throws for an invalid email address (no @)', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');

        await expect(
            sendResetPasswordEmail({ to: 'invalid', subject: 'Reset', url: 'https://app.example.com/reset' }),
        ).rejects.toThrow('Invalid email address: invalid');

        consoleError.mockRestore();
    });

    it('throws when RESEND_API_KEY is missing', async () => {
        delete process.env.RESEND_API_KEY;
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');

        await expect(
            sendResetPasswordEmail({ to: 'user@example.com', subject: 'Reset', url: 'https://app.example.com/reset' }),
        ).rejects.toThrow('Email service not configured. Please contact support.');

        expect(consoleError).toHaveBeenCalledWith(
            ' RESEND_API_KEY is not configured. Please add it to your .env file.',
        );
        consoleError.mockRestore();
    });

    it('sends email using default FROM address', async () => {
        mockReset_EmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendResetPasswordEmail({
            to: 'user@example.com',
            subject: 'Reset your password',
            url: 'https://app.example.com/reset',
        });

        expect(mockReset_ResendConstructor).toHaveBeenCalledWith('test-resend-key');
        expect(mockReset_EmailsSend).toHaveBeenCalledWith(
            expect.objectContaining({
                from: 'CNERSH <info@cameroon-national-ethics-com.net>',
                to: 'user@example.com',
                subject: 'Reset your password',
            }),
        );
        consoleLog.mockRestore();
    });

    it('uses EMAIL_FROM when configured', async () => {
        process.env.EMAIL_FROM = 'Custom <custom@example.com>';
        mockReset_EmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendResetPasswordEmail({
            to: 'user@example.com',
            subject: 'Reset your password',
            url: 'https://app.example.com/reset',
        });

        expect(mockReset_EmailsSend).toHaveBeenCalledWith(
            expect.objectContaining({ from: 'Custom <custom@example.com>' }),
        );
        consoleLog.mockRestore();
    });

    it('throws when Resend returns an error object', async () => {
        mockReset_EmailsSend.mockResolvedValueOnce({
            data: null,
            error: { message: 'provider-failed' },
        });
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');

        await expect(
            sendResetPasswordEmail({ to: 'user@example.com', subject: 'Reset', url: 'https://app.example.com/reset' }),
        ).rejects.toThrow('Failed to send email: provider-failed');

        expect(consoleError).toHaveBeenCalledWith(' Resend API error:', { message: 'provider-failed' });
        consoleError.mockRestore();
    });

    it('returns response on success', async () => {
        const mockResponse = { data: { id: 'email-1' }, error: null };
        mockReset_EmailsSend.mockResolvedValueOnce(mockResponse);
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        const result = await sendResetPasswordEmail({
            to: 'user@example.com',
            subject: 'Reset your password',
            url: 'https://app.example.com/reset',
        });

        expect(result).toBe(mockResponse);
        consoleLog.mockRestore();
    });

    it('reuses the same Resend instance across calls', async () => {
        mockReset_EmailsSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendResetPasswordEmail({ to: 'one@example.com', subject: 'Reset', url: 'https://app.example.com/reset' });
        await sendResetPasswordEmail({ to: 'two@example.com', subject: 'Reset', url: 'https://app.example.com/reset' });

        expect(mockReset_ResendConstructor).toHaveBeenCalledTimes(1);
        consoleLog.mockRestore();
    });

    it('logs error details for Error instances', async () => {
        mockReset_EmailsSend.mockRejectedValueOnce(new Error('smtp-down'));
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');

        await expect(
            sendResetPasswordEmail({ to: 'user@example.com', subject: 'Reset', url: 'https://app.example.com/reset' }),
        ).rejects.toThrow('smtp-down');

        expect(consoleError).toHaveBeenCalledWith(
            'Error details:',
            expect.objectContaining({ message: 'smtp-down', to: 'user@example.com' }),
        );
        consoleError.mockRestore();
    });

    it('rethrows non-Error failures without logging error details', async () => {
        mockReset_EmailsSend.mockRejectedValueOnce('plain-failure');
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');

        await expect(
            sendResetPasswordEmail({ to: 'user@example.com', subject: 'Reset', url: 'https://app.example.com/reset' }),
        ).rejects.toBe('plain-failure');

        expect(
            consoleError.mock.calls.some(([first]) => first === 'Error details:'),
        ).toBe(false);
        consoleError.mockRestore();
    });
});
const mockEmailsSend = jest.fn();
const mockResendConstructor = jest.fn(() => ({
    emails: { send: mockEmailsSend },
}));

jest.mock('resend', () => ({
    Resend: mockResendConstructor,
}));

jest.mock('@/emails/welcome-email', () => ({
    default: () => null,
}));

describe('sendWelcomeEmail', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = { ...originalEnv, RESEND_API_KEY: 'test-resend-key' };
        delete process.env.EMAIL_FROM;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('throws for an invalid email address', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendWelcomeEmail } = await import('@/lib/send-welcome-email');

        await expect(
            sendWelcomeEmail({ to: 'invalid', userName: 'Ada' }),
        ).rejects.toThrow('Invalid email address: invalid');

        consoleError.mockRestore();
    });

    it('throws when RESEND_API_KEY is missing', async () => {
        delete process.env.RESEND_API_KEY;
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendWelcomeEmail } = await import('@/lib/send-welcome-email');

        await expect(
            sendWelcomeEmail({ to: 'user@example.com', userName: 'Ada' }),
        ).rejects.toThrow('RESEND_API_KEY environment variable is not set.');

        consoleError.mockRestore();
    });

    it('sends email using default FROM address', async () => {
        mockEmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendWelcomeEmail } = await import('@/lib/send-welcome-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendWelcomeEmail({ to: 'user@example.com', userName: 'Ada' });

        expect(mockEmailsSend).toHaveBeenCalledWith(
            expect.objectContaining({
                from: 'CNERSH <info@cameroon-national-ethics-com.net>',
                to: 'user@example.com',
                subject: 'Welcome to CNERSH – Your Account is Ready!',
            }),
        );
        consoleLog.mockRestore();
    });

    it('uses EMAIL_FROM when configured', async () => {
        process.env.EMAIL_FROM = 'Custom <custom@example.com>';
        mockEmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendWelcomeEmail } = await import('@/lib/send-welcome-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendWelcomeEmail({ to: 'user@example.com', userName: 'Ada' });

        expect(mockEmailsSend).toHaveBeenCalledWith(
            expect.objectContaining({ from: 'Custom <custom@example.com>' }),
        );
        consoleLog.mockRestore();
    });

    it('throws when Resend returns an error object', async () => {
        mockEmailsSend.mockResolvedValueOnce({ data: null, error: { message: 'provider-failed' } });
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendWelcomeEmail } = await import('@/lib/send-welcome-email');

        await expect(
            sendWelcomeEmail({ to: 'user@example.com', userName: 'Ada' }),
        ).rejects.toThrow('Failed to send welcome email: provider-failed');

        consoleError.mockRestore();
    });

    it('returns response on success', async () => {
        const mockResponse = { data: { id: 'email-1' }, error: null };
        mockEmailsSend.mockResolvedValueOnce(mockResponse);
        const { sendWelcomeEmail } = await import('@/lib/send-welcome-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        const result = await sendWelcomeEmail({ to: 'user@example.com', userName: 'Ada' });

        expect(result).toBe(mockResponse);
        consoleLog.mockRestore();
    });

    it('reuses the same Resend instance across calls', async () => {
        mockEmailsSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
        const { sendWelcomeEmail } = await import('@/lib/send-welcome-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendWelcomeEmail({ to: 'one@example.com', userName: 'One' });
        await sendWelcomeEmail({ to: 'two@example.com', userName: 'Two' });

        expect(mockResendConstructor).toHaveBeenCalledTimes(1);
        consoleLog.mockRestore();
    });

    it('logs and rethrows errors', async () => {
        mockEmailsSend.mockRejectedValueOnce(new Error('smtp-down'));
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendWelcomeEmail } = await import('@/lib/send-welcome-email');

        await expect(
            sendWelcomeEmail({ to: 'user@example.com', userName: 'Ada' }),
        ).rejects.toThrow('smtp-down');

        expect(consoleError).toHaveBeenCalledWith(
            'Error in sendWelcomeEmail:',
            expect.any(Error),
        );
        consoleError.mockRestore();
    });
});
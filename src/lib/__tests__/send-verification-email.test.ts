const mockVerify_EmailsSend = jest.fn();
const mockVerify_ResendConstructor = jest.fn(() => ({
    emails: { send: mockVerify_EmailsSend },
}));

jest.mock('resend', () => ({
    Resend: mockVerify_ResendConstructor,
}));

jest.mock('@/emails/verification-email', () => ({
    default: () => null,
}));

describe('sendVerificationEmail', () => {
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
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');

        await expect(
            sendVerificationEmail({ to: 'invalid', verificationUrl: 'https://app.example.com/verify', userName: 'Ada' }),
        ).rejects.toThrow('Invalid email address: invalid');

        consoleError.mockRestore();
    });

    it('throws when RESEND_API_KEY is missing', async () => {
        delete process.env.RESEND_API_KEY;
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');

        await expect(
            sendVerificationEmail({ to: 'user@example.com', verificationUrl: 'https://app.example.com/verify', userName: 'Ada' }),
        ).rejects.toThrow('Email service not configured. Please contact support.');

        consoleError.mockRestore();
    });

    it('sends email using default FROM address', async () => {
        mockVerify_EmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendVerificationEmail({
            to: 'user@example.com',
            verificationUrl: 'https://app.example.com/verify',
            userName: 'Ada',
        });

        expect(mockVerify_EmailsSend).toHaveBeenCalledWith(
            expect.objectContaining({
                from: 'CNERSH <info@cameroon-national-ethics-com.net>',
                to: 'user@example.com',
                subject: 'Welcome to Cameroon National Ethics Community - CNERSH',
            }),
        );
        consoleLog.mockRestore();
    });

    it('uses EMAIL_FROM when configured', async () => {
        process.env.EMAIL_FROM = 'Custom <custom@example.com>';
        mockVerify_EmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendVerificationEmail({
            to: 'user@example.com',
            verificationUrl: 'https://app.example.com/verify',
            userName: 'Ada',
        });

        expect(mockVerify_EmailsSend).toHaveBeenCalledWith(
            expect.objectContaining({ from: 'Custom <custom@example.com>' }),
        );
        consoleLog.mockRestore();
    });

    it('throws when Resend returns an error object', async () => {
        mockVerify_EmailsSend.mockResolvedValueOnce({ data: null, error: { message: 'provider-failed' } });
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');

        await expect(
            sendVerificationEmail({ to: 'user@example.com', verificationUrl: 'https://app.example.com/verify', userName: 'Ada' }),
        ).rejects.toThrow('Failed to send email: provider-failed');

        consoleError.mockRestore();
    });

    it('returns response on success', async () => {
        const mockResponse = { data: { id: 'email-1' }, error: null };
        mockVerify_EmailsSend.mockResolvedValueOnce(mockResponse);
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        const result = await sendVerificationEmail({
            to: 'user@example.com',
            verificationUrl: 'https://app.example.com/verify',
            userName: 'Ada',
        });

        expect(result).toBe(mockResponse);
        consoleLog.mockRestore();
    });

    it('reuses the same Resend instance across calls', async () => {
        mockVerify_EmailsSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await sendVerificationEmail({ to: 'one@example.com', verificationUrl: 'https://app.example.com/verify', userName: 'One' });
        await sendVerificationEmail({ to: 'two@example.com', verificationUrl: 'https://app.example.com/verify', userName: 'Two' });

        expect(mockVerify_ResendConstructor).toHaveBeenCalledTimes(1);
        consoleLog.mockRestore();
    });

    it('logs error details for Error instances', async () => {
        mockVerify_EmailsSend.mockRejectedValueOnce(new Error('smtp-down'));
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');

        await expect(
            sendVerificationEmail({ to: 'user@example.com', verificationUrl: 'https://app.example.com/verify', userName: 'Ada' }),
        ).rejects.toThrow('smtp-down');

        expect(consoleError).toHaveBeenCalledWith(
            'Error details:',
            expect.objectContaining({ message: 'smtp-down', to: 'user@example.com', userName: 'Ada' }),
        );
        consoleError.mockRestore();
    });
});
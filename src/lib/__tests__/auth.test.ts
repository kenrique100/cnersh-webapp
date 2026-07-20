// src/lib/__tests__/auth.test.ts

jest.mock('better-auth', () => ({
    betterAuth: jest.fn((config) => ({ __config: config })),
}));

jest.mock('better-auth/adapters/prisma', () => ({
    prismaAdapter: jest.fn(() => 'prisma-adapter'),
}));

jest.mock('better-auth/next-js', () => ({
    nextCookies: jest.fn(() => 'next-cookies-plugin'),
}));

jest.mock('better-auth/plugins', () => ({
    admin: jest.fn(() => 'admin-plugin'),
}));

jest.mock('@/lib/db', () => ({
    db: { user: {} },
}));

jest.mock('@/lib/send-verification-email', () => ({
    sendVerificationEmail: jest.fn(),
}));

jest.mock('@/lib/send-reset-password-email', () => ({
    sendResetPasswordEmail: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
    ac: { tag: 'ac' },
    roles: {
        user: { tag: 'user-role' },
        admin: { tag: 'admin-role' },
        superadmin: { tag: 'superadmin-role' },
    },
}));

async function getConfig() {
    const { betterAuth } = await import('better-auth');
    return (betterAuth as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
}

describe('auth', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = {
            ...originalEnv,
            BETTER_AUTH_SECRET: 'test-secret',
            BETTER_AUTH_URL: 'https://app.example.com',
            BETTER_AUTH_TRUSTED_ORIGINS: 'https://one.example.com , https://two.example.com',
            GOOGLE_CLIENT_ID: 'google-client-id',
            GOOGLE_CLIENT_SECRET: 'google-client-secret',
        };
    });

    afterEach(async () => {
        process.env = originalEnv;
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it('calls betterAuth with correct database config', async () => {
        await import('@/lib/auth');
        const config = await getConfig();
        const { prismaAdapter } = await import('better-auth/adapters/prisma');
        const { db } = await import('@/lib/db');

        expect(prismaAdapter).toHaveBeenCalledWith(db, { provider: 'postgresql' });
        expect(config.database).toBe('prisma-adapter');
    });

    it('sets secret and baseURL from env', async () => {
        await import('@/lib/auth');
        const config = await getConfig();

        expect(config.secret).toBe('test-secret');
        expect(config.baseURL).toBe('https://app.example.com');
    });

    it('parses trustedOrigins by splitting and trimming', async () => {
        await import('@/lib/auth');
        const config = await getConfig();

        expect(config.trustedOrigins).toEqual([
            'https://one.example.com',
            'https://two.example.com',
        ]);
    });

    it('sets trustedOrigins to [baseURL] when env is not set', async () => {
        delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
        await import('@/lib/auth');
        const config = await getConfig();

        // The fallback is [authBaseUrl] from the source code
        expect(config.trustedOrigins).toEqual(['https://app.example.com']);
    });

    it('sets session expiresIn and updateAge to 24 hours', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as { session: { expiresIn: number; updateAge: number } };

        expect(config.session.expiresIn).toBe(60 * 60 * 24);
        expect(config.session.updateAge).toBe(60 * 60 * 24);
    });

    it('sets emailAndPassword config correctly', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            emailAndPassword: {
                enabled: boolean;
                requireEmailVerification: boolean;
                minPasswordLength: number;
            };
        };

        expect(config.emailAndPassword.enabled).toBe(true);
        expect(config.emailAndPassword.requireEmailVerification).toBe(true);
        expect(config.emailAndPassword.minPasswordLength).toBe(10);
    });

    it('sets rateLimit config correctly', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            rateLimit: { enabled: boolean; window: number; max: number };
        };

        expect(config.rateLimit).toEqual({ enabled: true, window: 60, max: 10 });
    });

    it('sets emailVerification config correctly', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            emailVerification: {
                sendOnSignUp: boolean;
                autoSignInAfterVerification: boolean;
            };
        };

        expect(config.emailVerification.sendOnSignUp).toBe(true);
        expect(config.emailVerification.autoSignInAfterVerification).toBe(true);
    });

    it('sets google social provider config correctly', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            socialProviders: {
                google: {
                    clientId: string;
                    clientSecret: string;
                    prompt: string;
                    redirectUri: string;
                };
            };
        };

        expect(config.socialProviders.google).toEqual({
            clientId: 'google-client-id',
            clientSecret: 'google-client-secret',
            prompt: 'select_account',
            redirectUri: 'https://app.example.com/api/auth/callback/google',
        });
    });

    it('registers admin and nextCookies plugins', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as { plugins: unknown[] };

        const { admin } = await import('better-auth/plugins');
        const { nextCookies } = await import('better-auth/next-js');

        expect(admin).toHaveBeenCalledWith({
            ac: { tag: 'ac' },
            roles: {
                user: { tag: 'user-role' },
                admin: { tag: 'admin-role' },
                superadmin: { tag: 'superadmin-role' },
            },
            defaultRole: 'user',
            adminRoles: ['admin', 'superadmin'],
        });
        expect(nextCookies).toHaveBeenCalledTimes(1);
        expect(config.plugins).toEqual(['admin-plugin', 'next-cookies-plugin']);
    });

    it('user additionalFields are correct', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            user: {
                additionalFields: Record<string, unknown>;
            };
        };

        expect(config.user.additionalFields.gender).toMatchObject({
            type: 'string',
            required: true,
            input: true,
        });
        expect(config.user.additionalFields.profession).toEqual({
            type: 'string',
            required: false,
            input: true,
        });
        expect(config.user.additionalFields.title).toEqual({
            type: 'string',
            required: false,
            input: true,
        });
        expect(config.user.additionalFields.welcomeEmailSent).toEqual({
            type: 'boolean',
            default: false,
        });
    });

    it('gender validate returns true for male', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            user: {
                additionalFields: {
                    gender: { validate: (v: string) => boolean | string };
                };
            };
        };

        expect(config.user.additionalFields.gender.validate('male')).toBe(true);
    });

    it('gender validate returns true for female', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            user: {
                additionalFields: {
                    gender: { validate: (v: string) => boolean | string };
                };
            };
        };

        expect(config.user.additionalFields.gender.validate('female')).toBe(true);
    });

    it('gender validate returns error string for invalid value', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            user: {
                additionalFields: {
                    gender: { validate: (v: string) => boolean | string };
                };
            };
        };

        expect(config.user.additionalFields.gender.validate('other')).toBe(
            'Invalid gender value'
        );
    });

    it('sendResetPassword throws when user email is missing', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            emailAndPassword: {
                sendResetPassword: (args: { user: Record<string, unknown>; url: string }) => Promise<void>;
            };
        };

        await expect(
            config.emailAndPassword.sendResetPassword({
                user: {},
                url: 'https://app.example.com/reset',
            }),
        ).rejects.toThrow('User email is required for password reset');

        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');
        expect(sendResetPasswordEmail).not.toHaveBeenCalled();
    });

    it('sendResetPassword calls sendResetPasswordEmail with correct args', async () => {
        const { sendResetPasswordEmail } = await import('@/lib/send-reset-password-email');
        const mockedSendResetPasswordEmail = jest.mocked(sendResetPasswordEmail);
        mockedSendResetPasswordEmail.mockResolvedValueOnce(undefined as never);

        await import('@/lib/auth');
        const config = await getConfig() as {
            emailAndPassword: {
                sendResetPassword: (args: { user: { email: string }; url: string }) => Promise<void>;
            };
        };

        await config.emailAndPassword.sendResetPassword({
            user: { email: 'user@example.com' },
            url: 'https://app.example.com/reset?token=abc',
        });

        expect(mockedSendResetPasswordEmail).toHaveBeenCalledWith({
            to: 'user@example.com',
            subject: 'Reset your password',
            url: 'https://app.example.com/reset?token=abc',
        });
    });

    it('sendVerificationEmail throws when user email is missing', async () => {
        await import('@/lib/auth');
        const config = await getConfig() as {
            emailVerification: {
                sendVerificationEmail: (args: { user: Record<string, unknown>; url: string }) => Promise<void>;
            };
        };

        await expect(
            config.emailVerification.sendVerificationEmail({
                user: {},
                url: 'https://app.example.com/verify',
            }),
        ).rejects.toThrow('User email is required for verification');

        const { sendVerificationEmail } = await import('@/lib/send-verification-email');
        expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('sendVerificationEmail calls sendVerificationEmail with callbackURL set', async () => {
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');
        const mockedSendVerificationEmail = jest.mocked(sendVerificationEmail);
        mockedSendVerificationEmail.mockResolvedValueOnce(undefined as never);

        await import('@/lib/auth');
        const config = await getConfig() as {
            emailVerification: {
                sendVerificationEmail: (args: {
                    user: { email: string; name: string };
                    url: string;
                }) => Promise<void>;
            };
        };

        await config.emailVerification.sendVerificationEmail({
            user: { email: 'user@example.com', name: 'Ada' },
            url: 'https://app.example.com/verify?token=xyz',
        });

        const call = mockedSendVerificationEmail.mock.calls[0][0];
        expect(call.to).toBe('user@example.com');
        expect(call.userName).toBe('Ada');

        const parsed = new URL(call.verificationUrl);
        expect(parsed.searchParams.get('callbackURL')).toBe('/');
        expect(parsed.searchParams.get('token')).toBe('xyz');
    });

    it('sendVerificationEmail sends undefined userName when user.name is null', async () => {
        const { sendVerificationEmail } = await import('@/lib/send-verification-email');
        const mockedSendVerificationEmail = jest.mocked(sendVerificationEmail);
        mockedSendVerificationEmail.mockResolvedValueOnce(undefined as never);

        await import('@/lib/auth');
        const config = await getConfig() as {
            emailVerification: {
                sendVerificationEmail: (args: {
                    user: { email: string; name: null };
                    url: string;
                }) => Promise<void>;
            };
        };

        await config.emailVerification.sendVerificationEmail({
            user: { email: 'user@example.com', name: null },
            url: 'https://app.example.com/verify?token=xyz',
        });

        expect(mockedSendVerificationEmail).toHaveBeenCalledWith(
            expect.objectContaining({ userName: undefined }),
        );
    });
});
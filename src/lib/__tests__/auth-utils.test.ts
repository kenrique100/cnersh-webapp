const mockGetSession = jest.fn();
const mockHeaders = jest.fn();
const mockRedirect = jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
});
const mockFindUnique = jest.fn();
const mockUpdateMany = jest.fn();
const mockSendWelcomeEmail = jest.fn();

// Replaced : any with : unknown to satisfy the ESLint rule completely
jest.mock('next/headers', () => ({
    headers: jest.fn(() => mockHeaders()),
}));

jest.mock('next/navigation', () => ({
    redirect: jest.fn((url: string) => mockRedirect(url)),
}));

jest.mock('@/lib/auth', () => ({
    auth: {
        api: {
            getSession: jest.fn((opts: unknown) => mockGetSession(opts)),
        },
    },
}));

jest.mock('@/lib/db', () => ({
    db: {
        user: {
            findUnique: jest.fn((args: unknown) => mockFindUnique(args)),
            updateMany: jest.fn((args: unknown) => mockUpdateMany(args)),
        },
    },
}));

jest.mock('@/lib/send-welcome-email', () => ({
    sendWelcomeEmail: jest.fn((opts: unknown) => mockSendWelcomeEmail(opts)),
}));

import {
    authSession,
    authIsRequired,
    authIsNotRequired,
    getDashboardPath,
} from '@/lib/auth-utils';

describe('authSession', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHeaders.mockResolvedValue({ cookie: 'session=abc' });
    });

    it('returns session when found', async () => {
        const session = { user: { id: 'user-1', role: 'user' } };
        mockGetSession.mockResolvedValueOnce(session);

        const result = await authSession();

        expect(mockHeaders).toHaveBeenCalledTimes(1);
        expect(mockGetSession).toHaveBeenCalledWith({ headers: { cookie: 'session=abc' } });
        expect(result).toBe(session);
    });

    it('returns null when session is null', async () => {
        mockGetSession.mockResolvedValueOnce(null);

        const result = await authSession();

        expect(result).toBeNull();
    });

    it('returns null and logs error when getSession throws', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('session-error');
        mockGetSession.mockRejectedValueOnce(error);

        const result = await authSession();

        expect(result).toBeNull();
        expect(consoleError).toHaveBeenCalledWith('Session fetch failed:', error);
        consoleError.mockRestore();
    });
});

describe('getDashboardPath', () => {
    it('returns /admin for admin role', () => {
        expect(getDashboardPath('admin')).toBe('/admin');
    });

    it('returns /admin for superadmin role', () => {
        expect(getDashboardPath('superadmin')).toBe('/admin');
    });

    it('returns /dashboard for user role', () => {
        expect(getDashboardPath('user')).toBe('/dashboard');
    });

    it('returns /dashboard for null', () => {
        expect(getDashboardPath(null)).toBe('/dashboard');
    });

    it('returns /dashboard for undefined', () => {
        expect(getDashboardPath(undefined)).toBe('/dashboard');
    });
});

describe('authIsRequired', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHeaders.mockResolvedValue({ cookie: 'session=abc' });
    });

    it('redirects to /sign-in when session is missing', async () => {
        mockGetSession.mockResolvedValueOnce(null);

        await expect(authIsRequired()).rejects.toThrow('NEXT_REDIRECT:/sign-in');
        expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
        expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it('returns session and skips welcome email when user not found in db', async () => {
        const session = { user: { id: 'user-1', role: 'user' } };
        mockGetSession.mockResolvedValueOnce(session);
        mockFindUnique.mockResolvedValueOnce(null);

        const result = await authIsRequired();

        expect(result).toBe(session);
        expect(mockFindUnique).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            select: { email: true, name: true, emailVerified: true },
        });
        expect(mockUpdateMany).not.toHaveBeenCalled();
        expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    });

    it('skips welcome email when emailVerified is false', async () => {
        const session = { user: { id: 'user-1', role: 'user' } };
        mockGetSession.mockResolvedValueOnce(session);
        mockFindUnique.mockResolvedValueOnce({
            email: 'user@example.com',
            name: 'Ada',
            emailVerified: false,
        });

        const result = await authIsRequired();

        expect(result).toBe(session);
        expect(mockUpdateMany).not.toHaveBeenCalled();
        expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    });

    it('logs and skips sending when welcome email already sent (count === 0)', async () => {
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
        const session = { user: { id: 'user-1', role: 'user' } };
        mockGetSession.mockResolvedValueOnce(session);
        mockFindUnique.mockResolvedValueOnce({
            email: 'user@example.com',
            name: 'Ada',
            emailVerified: true,
        });
        mockUpdateMany.mockResolvedValueOnce({ count: 0 });

        const result = await authIsRequired();

        expect(result).toBe(session);
        expect(mockUpdateMany).toHaveBeenCalledWith({
            where: { id: 'user-1', welcomeEmailSent: false },
            data: { welcomeEmailSent: true },
        });
        expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
        expect(consoleLog).toHaveBeenCalledWith(
            'Welcome email already sent for user user-1, skipping.',
        );
        consoleLog.mockRestore();
    });

    it('sends welcome email with user name when count > 0', async () => {
        const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
        const session = { user: { id: 'user-1', role: 'user' } };
        mockGetSession.mockResolvedValueOnce(session);
        mockFindUnique.mockResolvedValueOnce({
            email: 'user@example.com',
            name: 'Ada',
            emailVerified: true,
        });
        mockUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockSendWelcomeEmail.mockResolvedValueOnce(undefined);

        const result = await authIsRequired();

        expect(result).toBe(session);
        expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
            to: 'user@example.com',
            userName: 'Ada',
        });
        expect(consoleLog).toHaveBeenCalledWith('Welcome email sent for user user-1');
        consoleLog.mockRestore();
    });

    it('uses "User" as fallback userName when name is empty', async () => {
        const session = { user: { id: 'user-1', role: 'user' } };
        mockGetSession.mockResolvedValueOnce(session);
        mockFindUnique.mockResolvedValueOnce({
            email: 'user@example.com',
            name: '',
            emailVerified: true,
        });
        mockUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockSendWelcomeEmail.mockResolvedValueOnce(undefined);

        await authIsRequired();

        expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
            to: 'user@example.com',
            userName: 'User',
        });
    });

    it('swallows welcome email error and still returns session', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const session = { user: { id: 'user-1', role: 'user' } };
        mockGetSession.mockResolvedValueOnce(session);
        mockFindUnique.mockResolvedValueOnce({
            email: 'user@example.com',
            name: 'Ada',
            emailVerified: true,
        });
        mockUpdateMany.mockResolvedValueOnce({ count: 1 });
        const error = new Error('smtp-failed');
        mockSendWelcomeEmail.mockRejectedValueOnce(error);

        const result = await authIsRequired();

        expect(result).toBe(session);
        expect(consoleError).toHaveBeenCalledWith('Failed to send welcome email:', error);
        consoleError.mockRestore();
    });
});

describe('authIsNotRequired', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHeaders.mockResolvedValue({ cookie: 'session=abc' });
    });

    it('does nothing when no session exists', async () => {
        mockGetSession.mockResolvedValueOnce(null);

        await expect(authIsNotRequired()).resolves.toBeUndefined();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('redirects to /admin when role is admin', async () => {
        mockGetSession.mockResolvedValueOnce({ user: { id: 'admin-1', role: 'admin' } });

        await expect(authIsNotRequired()).rejects.toThrow('NEXT_REDIRECT:/admin');
        expect(mockRedirect).toHaveBeenCalledWith('/admin');
    });

    it('redirects to /admin when role is superadmin', async () => {
        mockGetSession.mockResolvedValueOnce({ user: { id: 'super-1', role: 'superadmin' } });

        await expect(authIsNotRequired()).rejects.toThrow('NEXT_REDIRECT:/admin');
        expect(mockRedirect).toHaveBeenCalledWith('/admin');
    });

    it('redirects to /dashboard for regular user role', async () => {
        mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1', role: 'user' } });

        await expect(authIsNotRequired()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
        expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to /dashboard when role is undefined', async () => {
        mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });

        await expect(authIsNotRequired()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
        expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
    });
});
/**
 * @jest-environment node
 */

const mockAdminClient = jest.fn(() => 'admin-client-plugin');
const mockCreateAuthClient = jest.fn((config) => ({ __config: config }));

jest.mock('better-auth/client/plugins', () => ({
    adminClient: mockAdminClient,
}));

jest.mock('better-auth/react', () => ({
    createAuthClient: mockCreateAuthClient,
}));

jest.mock('@/lib/permissions', () => ({
    ac: { tag: 'ac' },
    roles: { user: {}, admin: {}, superadmin: {} },
}));

describe('authClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.NEXT_PUBLIC_APP_URL;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('uses NEXT_PUBLIC_APP_URL when set', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://public.example.com';
        await import('@/lib/auth-client');
        const config = mockCreateAuthClient.mock.calls[0][0] as { baseURL: string };

        expect(config.baseURL).toBe('https://public.example.com');
    });

    it('falls back to empty string when NEXT_PUBLIC_APP_URL is not set and window is undefined', async () => {
        // Since the file environment is 'node', window is natively undefined.
        delete process.env.NEXT_PUBLIC_APP_URL;

        await import('@/lib/auth-client');
        const config = mockCreateAuthClient.mock.calls[0][0] as { baseURL: string };

        expect(config.baseURL).toBe('');
    });

    it('registers adminClient plugin with ac and roles', async () => {
        await import('@/lib/auth-client');
        const config = mockCreateAuthClient.mock.calls[0][0] as { plugins: unknown[] };

        expect(mockAdminClient).toHaveBeenCalledWith({
            ac: { tag: 'ac' },
            roles: { user: {}, admin: {}, superadmin: {} },
        });
        expect(config.plugins).toEqual(['admin-client-plugin']);
    });

    it('exports authClient', async () => {
        const mod = await import('@/lib/auth-client');
        expect(mod.authClient).toBeDefined();
    });
});
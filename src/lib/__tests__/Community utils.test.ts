import { formatTime, formatDate, getDisplayName } from '@/components/community';

const originalEnv = process.env;

beforeEach(() => {
    process.env = { ...originalEnv };
    global.fetch = jest.fn();
});

afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
});

describe('formatTime', () => {
    it('formats a date to a 12-hour time string', () => {
        const date = new Date('2024-03-15T14:30:00');
        const result = formatTime(date);
        expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });

    it('includes minutes', () => {
        const date = new Date('2024-03-15T09:05:00');
        const result = formatTime(date);
        expect(result).toMatch(/05/);
    });
});

describe('formatDate', () => {
    it('returns a formatted date string with weekday', () => {
        const date = new Date('2024-03-15T00:00:00');
        const result = formatDate(date);
        expect(result).toMatch(/Friday/);
        expect(result).toMatch(/March/);
        expect(result).toMatch(/2024/);
    });

    it('returns a string with numeric day', () => {
        const date = new Date('2024-03-15T00:00:00');
        const result = formatDate(date);
        expect(result).toMatch(/15/);
    });
});

describe('getDisplayName', () => {
    it('returns "CNERSH Admin" for admin role', () => {
        const user = { role: 'admin', name: 'John Doe' };
        expect(getDisplayName(user as Parameters<typeof getDisplayName>[0])).toBe('CNERSH Admin');
    });

    it('returns "CNERSH Admin" for superadmin role', () => {
        const user = { role: 'superadmin', name: 'Super Person' };
        expect(getDisplayName(user as Parameters<typeof getDisplayName>[0])).toBe('CNERSH Admin');
    });

    it('returns the user name for non-admin roles', () => {
        const user = { role: 'member', name: 'Alice Mbah' };
        expect(getDisplayName(user as Parameters<typeof getDisplayName>[0])).toBe('Alice Mbah');
    });

    it('returns "Unknown" when name is null', () => {
        const user = { role: 'member', name: null };
        expect(getDisplayName(user as Parameters<typeof getDisplayName>[0])).toBe('Unknown');
    });

    it('returns "Unknown" when name is empty string', () => {
        const user = { role: 'member', name: '' };
        expect(getDisplayName(user as Parameters<typeof getDisplayName>[0])).toBe('Unknown');
    });
});

describe('deleteBlobUrl', () => {
    it('calls /api/delete-blob for a matching pull zone URL', async () => {
        process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = 'https://cnersh.b-cdn.net';
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const { deleteBlobUrl } = await import('../../components/community/utils');
        await deleteBlobUrl('https://cnersh.b-cdn.net/cnersh-assets/images/photo.jpg');

        expect(fetch).toHaveBeenCalledWith(
            '/api/delete-blob',
            expect.objectContaining({ method: 'DELETE' })
        );
    });

    it('does not call fetch for a URL from a different host', async () => {
        process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = 'https://cnersh.b-cdn.net';

        const { deleteBlobUrl } = await import('../../components/community/utils');
        await deleteBlobUrl('https://other-cdn.net/some/image.jpg');

        expect(fetch).not.toHaveBeenCalled();
    });

    it('does not call fetch when NEXT_PUBLIC_BUNNY_PULL_ZONE_URL is not set', async () => {
        delete process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL;

        const { deleteBlobUrl } = await import('../../components/community/utils');
        await deleteBlobUrl('https://cnersh.b-cdn.net/photo.jpg');

        expect(fetch).not.toHaveBeenCalled();
    });

    it('does not throw when fetch fails', async () => {
        process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = 'https://cnersh.b-cdn.net';
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const { deleteBlobUrl } = await import('../../components/community/utils');
        await expect(
            deleteBlobUrl('https://cnersh.b-cdn.net/photo.jpg')
        ).resolves.toBeUndefined();
    });

    it('does not throw for a completely invalid URL', async () => {
        process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = 'https://cnersh.b-cdn.net';

        const { deleteBlobUrl } = await import('../../components/community/utils');
        await expect(deleteBlobUrl('not-a-url')).resolves.toBeUndefined();
    });
});
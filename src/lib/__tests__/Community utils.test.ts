import {
    formatTime,
    formatDate,
    formatDateSeparator,
    isSameDay,
    getDisplayName,
} from '@/components/community/utils';

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
    it('formats a date as 24-hour HH:MM', () => {
        const date = new Date('2024-03-15T14:30:00');
        expect(formatTime(date)).toBe('14:30');
    });

    it('zero-pads hours and minutes', () => {
        const date = new Date('2024-03-15T09:05:00');
        expect(formatTime(date)).toBe('09:05');
    });

    it('handles midnight correctly', () => {
        const date = new Date('2024-03-15T00:00:00');
        expect(formatTime(date)).toBe('00:00');
    });

    it('handles end of day correctly', () => {
        const date = new Date('2024-03-15T23:59:00');
        expect(formatTime(date)).toBe('23:59');
    });

    it('accepts a string date', () => {
        expect(formatTime('2024-03-15T14:30:00')).toBe('14:30');
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

    it('accepts a string date', () => {
        const result = formatDate('2024-03-15T00:00:00');
        expect(result).toMatch(/Friday/);
    });
});

describe('isSameDay', () => {
    it('returns true for two timestamps on the same calendar day', () => {
        const a = new Date('2024-03-15T00:01:00');
        const b = new Date('2024-03-15T23:59:00');
        expect(isSameDay(a, b)).toBe(true);
    });

    it('returns false for two timestamps on different calendar days', () => {
        const a = new Date('2024-03-15T23:59:00');
        const b = new Date('2024-03-16T00:01:00');
        expect(isSameDay(a, b)).toBe(false);
    });

    it('returns false when days differ even within the same month', () => {
        const a = new Date('2024-03-15T12:00:00');
        const b = new Date('2024-03-16T12:00:00');
        expect(isSameDay(a, b)).toBe(false);
    });

    it('returns true for identical Date instances', () => {
        const a = new Date('2024-03-15T12:00:00');
        expect(isSameDay(a, a)).toBe(true);
    });

    it('accepts string dates', () => {
        expect(isSameDay('2024-03-15T01:00:00', '2024-03-15T22:00:00')).toBe(true);
        expect(isSameDay('2024-03-15T01:00:00', '2024-03-16T01:00:00')).toBe(false);
    });
});

describe('formatDateSeparator', () => {
    it('returns "Today" for the current calendar day', () => {
        const now = new Date();
        expect(formatDateSeparator(now)).toBe('Today');
    });

    it('returns "Today" for an earlier time on the current day', () => {
        const morning = new Date();
        morning.setHours(0, 5, 0, 0);
        expect(formatDateSeparator(morning)).toBe('Today');
    });

    it('returns "Yesterday" for the previous calendar day', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(formatDateSeparator(yesterday)).toBe('Yesterday');
    });

    it('returns "Yesterday" for an early time on the previous day', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 5, 0, 0);
        expect(formatDateSeparator(yesterday)).toBe('Yesterday');
    });

    it('returns an exact long-form date for older messages', () => {
        // Use a fixed past date so the test is not sensitive to the clock.
        const result = formatDateSeparator(new Date('2020-09-24T10:00:00'));
        expect(result).toMatch(/September/);
        expect(result).toMatch(/24/);
        expect(result).toMatch(/2020/);
    });

    it('does not return Today/Yesterday for two days ago', () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const result = formatDateSeparator(twoDaysAgo);
        expect(result).not.toBe('Today');
        expect(result).not.toBe('Yesterday');
    });

    it('accepts a string date', () => {
        expect(formatDateSeparator('2020-09-24T10:00:00')).toMatch(/September/);
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
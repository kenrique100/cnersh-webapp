import { getCachedPreview, setCachedPreview } from '../cache';
import { redis } from '@/lib/redis';

jest.mock('@/lib/redis', () => ({
    redis: {
        get: jest.fn(),
        set: jest.fn(),
    },
}));

const mockRedisGet = redis.get as jest.Mock;
const mockRedisSet = redis.set as jest.Mock;

const cachedData = {
    title: 'Cached Title',
    description: 'Cached Desc',
    image: 'https://example.com/img.jpg',
    domain: 'example.com',
};

describe('cache', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCachedPreview', () => {
        it('returns parsed JSON when key exists', async () => {
            mockRedisGet.mockResolvedValue(JSON.stringify(cachedData));
            const result = await getCachedPreview('https://example.com');
            expect(result).toEqual(cachedData);
            expect(mockRedisGet).toHaveBeenCalledWith(expect.stringContaining('linkpreview:v1:'));
        });

        it('returns null when key does not exist', async () => {
            mockRedisGet.mockResolvedValue(null);
            const result = await getCachedPreview('https://example.com');
            expect(result).toBeNull();
        });

        it('returns null on Redis error (fails gracefully)', async () => {
            mockRedisGet.mockRejectedValue(new Error('Redis down'));
            const result = await getCachedPreview('https://example.com');
            expect(result).toBeNull();
        });
    });

    describe('setCachedPreview', () => {
        it('stores JSON in Redis with TTL', async () => {
            await setCachedPreview('https://example.com', cachedData);
            expect(mockRedisSet).toHaveBeenCalledWith(
                expect.stringContaining('linkpreview:v1:'),
                JSON.stringify(cachedData),
                86400
            );
        });

        it('does not throw on Redis error', async () => {
            mockRedisSet.mockRejectedValue(new Error('Redis down'));
            await expect(setCachedPreview('https://example.com', cachedData)).resolves.toBeUndefined();
        });
    });
});
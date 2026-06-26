import { getTrendingTags } from '@/lib/trending-service';

const mockTrending_queryRaw = jest.fn();
jest.mock('@/lib/db', () => ({
    db: {
        $queryRaw: (...args: unknown[]) => mockTrending_queryRaw(...args),
    },
}));

const mockTrending_getJson = jest.fn();
const mockTrending_setJson = jest.fn();
jest.mock('@/lib/redis', () => ({
    redis: {
        getJson: (...args: unknown[]) => mockTrending_getJson(...args),
        setJson: (...args: unknown[]) => mockTrending_setJson(...args),
    },
}));

describe('getTrendingTags', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns cached trending tags immediately if present in Redis', async () => {
        const mockCache = [
            { tag: 'TypeScript', posts: 10, score: 95 },
            { tag: 'Nextjs', posts: 5, score: 80 },
        ];
        mockTrending_getJson.mockResolvedValueOnce(mockCache);

        const result = await getTrendingTags(2);

        expect(mockTrending_getJson).toHaveBeenCalledWith('trending:tags:v2:2');
        expect(mockTrending_queryRaw).not.toHaveBeenCalled();
        expect(result).toEqual(mockCache);
    });

    it('fetches from the materialized view on a cache miss and updates Redis', async () => {
        mockTrending_getJson.mockResolvedValueOnce(null);
        mockTrending_queryRaw.mockResolvedValueOnce([
            { tag_norm: 'health research', count: BigInt(15), score: 98.5 },
            { tag_norm: 'ethics', count: BigInt(8), score: 84.0 },
        ]);

        const result = await getTrendingTags(2);

        expect(mockTrending_getJson).toHaveBeenCalledWith('trending:tags:v2:2');

        // FIX: Target the first argument (the string fragments array) of the first call directly
        const firstQueryCallArgs = mockTrending_queryRaw.mock.calls[0];
        expect(firstQueryCallArgs[0]).toEqual(
            expect.arrayContaining([expect.stringContaining('FROM mv_trending_tags')])
        );
        expect(firstQueryCallArgs[1]).toBe(2); // Validates the limit variable was passed correctly

        expect(mockTrending_setJson).toHaveBeenCalledWith('trending:tags:v2:2', result, 120);

        expect(result).toEqual([
            { tag: 'Health Research', posts: 15, score: 98.5 },
            { tag: 'Ethics', posts: 8, score: 84.0 },
        ]);
    });

    it('falls back to the raw query path if the materialized view query fails', async () => {
        mockTrending_getJson.mockResolvedValueOnce(null);
        mockTrending_queryRaw.mockRejectedValueOnce(new Error('Relation mv_trending_tags does not exist'));
        mockTrending_queryRaw.mockResolvedValueOnce([
            { tag: 'community care', count: BigInt(4) },
        ]);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await getTrendingTags(5);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[TrendingService] MV unavailable, falling back:'),
            expect.any(Error),
        );
        expect(mockTrending_queryRaw).toHaveBeenCalledTimes(2);
        expect(mockTrending_setJson).toHaveBeenCalledWith('trending:tags:v2:5', result, 30);
        expect(result).toEqual([
            { tag: 'Community Care', posts: 4, score: 4 },
        ]);

        consoleErrorSpy.mockRestore();
    });
});
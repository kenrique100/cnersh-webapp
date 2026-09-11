import { redis } from '@/lib/redis';
import {
    getResponse,
    saveResponse,
    claimKey,
    getClaim,
    releaseKey,
} from '@/lib/idempotency-store';

// Jest hoists this block to the top. Defining the mocks inline avoids initialization errors.
jest.mock('@/lib/redis', () => ({
    redis: {
        getJson: jest.fn(),
        setJson: jest.fn(),
        setnx: jest.fn(),
        get: jest.fn(),
        compareAndDelete: jest.fn(),
        del: jest.fn(),
    },
}));

// Create a typed reference to the mocked redis instance
const mockedRedis = jest.mocked(redis);

describe('idempotency', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getResponse', () => {
        it('returns stored response when found', async () => {
            const stored = { status: 200, body: { ok: true } };
            mockedRedis.getJson.mockResolvedValueOnce(stored);

            const result = await getResponse('key-1');

            expect(mockedRedis.getJson).toHaveBeenCalledWith('idemp:resp:key-1');
            expect(result).toBe(stored);
        });

        it('returns null when no response stored', async () => {
            mockedRedis.getJson.mockResolvedValueOnce(null);

            const result = await getResponse('key-1');

            expect(result).toBeNull();
        });
    });

    describe('saveResponse', () => {
        it('calls redis.setJson with correct prefixed key, status, body and ttl', async () => {
            mockedRedis.setJson.mockResolvedValueOnce(undefined);

            await saveResponse('key-1', 200, { ok: true }, 300);

            expect(mockedRedis.setJson).toHaveBeenCalledWith(
                'idemp:resp:key-1',
                { status: 200, body: { ok: true } },
                300,
            );
        });
    });

    describe('claimKey', () => {
        it('returns true when lock is acquired', async () => {
            mockedRedis.setnx.mockResolvedValueOnce(true);

            const result = await claimKey('key-1', 60);

            expect(mockedRedis.setnx).toHaveBeenCalledWith('idemp:lock:key-1', '1', 60);
            expect(result).toBe(true);
        });

        it('returns false when lock is already held', async () => {
            mockedRedis.setnx.mockResolvedValueOnce(false);

            const result = await claimKey('key-1', 60);

            expect(result).toBe(false);
        });

        it('stores an owner token when supplied', async () => {
            mockedRedis.setnx.mockResolvedValueOnce(true);

            await claimKey('key-1', 60, 'request-hash:owner-token');

            expect(mockedRedis.setnx).toHaveBeenCalledWith(
                'idemp:lock:key-1',
                'request-hash:owner-token',
                60,
            );
        });
    });

    describe('getClaim', () => {
        it('returns the active claim value', async () => {
            mockedRedis.get.mockResolvedValueOnce('request-hash:owner-token');

            await expect(getClaim('key-1')).resolves.toBe('request-hash:owner-token');
            expect(mockedRedis.get).toHaveBeenCalledWith('idemp:lock:key-1');
        });
    });

    describe('releaseKey', () => {
        it('calls redis.del with the correct prefixed key', async () => {
            mockedRedis.del.mockResolvedValueOnce(undefined);

            await releaseKey('key-1');

            expect(mockedRedis.del).toHaveBeenCalledWith('idemp:lock:key-1');
        });

        it('only deletes a lock owned by the supplied token', async () => {
            mockedRedis.compareAndDelete.mockResolvedValueOnce(true);

            await releaseKey('key-1', 'owner-token');

            expect(mockedRedis.compareAndDelete).toHaveBeenCalledWith(
                'idemp:lock:key-1',
                'owner-token',
            );
            expect(mockedRedis.del).not.toHaveBeenCalled();
        });
    });
});

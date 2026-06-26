/**
 * @jest-environment node
 */

const mockIoRedisGet = jest.fn();
const mockIoRedisSet = jest.fn();
const mockIoRedisDel = jest.fn();
const mockIoRedisPipeline = jest.fn();
const mockIoRedisOn = jest.fn();

const mockIoRedisInstance = {
    get: mockIoRedisGet,
    set: mockIoRedisSet,
    del: mockIoRedisDel,
    pipeline: mockIoRedisPipeline,
    on: mockIoRedisOn,
};

const mockIoRedisConstructor = jest.fn(() => mockIoRedisInstance);

jest.mock('ioredis', () => mockIoRedisConstructor);

describe('redis (memory client — no REDIS_URL)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.REDIS_URL;
        delete globalThis.__redis;
        delete globalThis.__redis_mem;
        delete globalThis.__redis_zsets;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('get returns null for a key that was never set', async () => {
        const { redis } = await import('@/lib/redis');
        const result = await redis.get('missing-key');
        expect(result).toBeNull();
    });

    it('set and get round-trip a string value', async () => {
        const { redis } = await import('@/lib/redis');
        await redis.set('key-1', 'value-1');
        const result = await redis.get('key-1');
        expect(result).toBe('value-1');
    });

    it('set with TTL stores value retrievable before expiry', async () => {
        const { redis } = await import('@/lib/redis');
        await redis.set('key-ttl', 'hello', 60);
        const result = await redis.get('key-ttl');
        expect(result).toBe('hello');
    });

    it('del removes a key', async () => {
        const { redis } = await import('@/lib/redis');
        await redis.set('key-del', 'value');
        await redis.del('key-del');
        const result = await redis.get('key-del');
        expect(result).toBeNull();
    });

    it('setnx returns true when key does not exist', async () => {
        const { redis } = await import('@/lib/redis');
        const result = await redis.setnx('lock-key', 'value', 60);
        expect(result).toBe(true);
    });

    it('setnx returns false when key already exists', async () => {
        const { redis } = await import('@/lib/redis');
        await redis.setnx('lock-key', 'first', 60);
        const result = await redis.setnx('lock-key', 'second', 60);
        expect(result).toBe(false);
    });

    it('getJson returns parsed object', async () => {
        const { redis } = await import('@/lib/redis');
        await redis.set('json-key', JSON.stringify({ foo: 'bar' }));
        const result = await redis.getJson<{ foo: string }>('json-key');
        expect(result).toEqual({ foo: 'bar' });
    });

    it('getJson returns null for missing key', async () => {
        const { redis } = await import('@/lib/redis');
        const result = await redis.getJson('missing-json');
        expect(result).toBeNull();
    });

    it('getJson returns null for invalid JSON', async () => {
        const { redis } = await import('@/lib/redis');
        await redis.set('bad-json', 'not-valid-json{{{');
        const result = await redis.getJson('bad-json');
        expect(result).toBeNull();
    });

    it('setJson stores serialised JSON', async () => {
        const { redis } = await import('@/lib/redis');
        await redis.setJson('json-key', { a: 1 }, 60);
        const raw = await redis.get('json-key');
        expect(JSON.parse(raw!)).toEqual({ a: 1 });
    });

    it('pipeline returns a MemoryPipeline with exec', async () => {
        const { redis } = await import('@/lib/redis');
        const pl = redis.pipeline() as ReturnType<typeof redis.pipeline>;
        expect(pl).toBeDefined();
        expect(typeof (pl as { exec: unknown }).exec).toBe('function');
    });

    it('pipeline zremrangebyscore, zcard, zadd, expire and exec work', async () => {
        const { redis } = await import('@/lib/redis');
        const pl = redis.pipeline() as {
            zremrangebyscore: (k: string, min: number, max: number) => void;
            zcard: (k: string) => void;
            zadd: (k: string, score: number, member: string) => void;
            expire: (k: string, seconds: number) => void;
            exec: () => Promise<[null, unknown][]>;
        };
        pl.zremrangebyscore('zset-1', 0, 100);
        pl.zadd('zset-1', 1, 'member-a');
        pl.zcard('zset-1');
        pl.expire('zset-1', 60);
        const results = await pl.exec();
        expect(Array.isArray(results)).toBe(true);
    });

    it('setnx without TTL stores value with no expiry', async () => {
        const { redis } = await import('@/lib/redis');
        const result = await redis.setnx('no-ttl-key', 'value');
        expect(result).toBe(true);
        const val = await redis.get('no-ttl-key');
        expect(val).toBe('value');
    });
});

describe('redis (ioredis client — with REDIS_URL)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = { ...originalEnv, REDIS_URL: 'redis://localhost:6379' };
        delete globalThis.__redis;
        delete globalThis.__redis_mem;
        delete globalThis.__redis_zsets;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('get delegates to ioredis.get', async () => {
        mockIoRedisGet.mockResolvedValueOnce('value-1');
        const { redis } = await import('@/lib/redis');
        const result = await redis.get('key-1');
        expect(mockIoRedisGet).toHaveBeenCalledWith('key-1');
        expect(result).toBe('value-1');
    });

    it('set with TTL calls ioredis.set with EX', async () => {
        mockIoRedisSet.mockResolvedValueOnce('OK');
        const { redis } = await import('@/lib/redis');
        await redis.set('key-1', 'value-1', 60);
        expect(mockIoRedisSet).toHaveBeenCalledWith('key-1', 'value-1', 'EX', 60);
    });

    it('set without TTL calls ioredis.set without EX', async () => {
        mockIoRedisSet.mockResolvedValueOnce('OK');
        const { redis } = await import('@/lib/redis');
        await redis.set('key-1', 'value-1');
        expect(mockIoRedisSet).toHaveBeenCalledWith('key-1', 'value-1');
    });

    it('del delegates to ioredis.del', async () => {
        mockIoRedisDel.mockResolvedValueOnce(1);
        const { redis } = await import('@/lib/redis');
        await redis.del('key-1');
        expect(mockIoRedisDel).toHaveBeenCalledWith('key-1');
    });

    it('setnx with TTL uses set with EX and NX', async () => {
        mockIoRedisSet.mockResolvedValueOnce('OK');
        const { redis } = await import('@/lib/redis');
        const result = await redis.setnx('lock-key', 'value', 60);
        expect(mockIoRedisSet).toHaveBeenCalledWith('lock-key', 'value', 'EX', 60, 'NX');
        expect(result).toBe(true);
    });

    it('setnx with TTL returns false when set returns null', async () => {
        mockIoRedisSet.mockResolvedValueOnce(null);
        const { redis } = await import('@/lib/redis');
        const result = await redis.setnx('lock-key', 'value', 60);
        expect(result).toBe(false);
    });

    it('setnx without TTL uses set with NX only', async () => {
        mockIoRedisSet.mockResolvedValueOnce('OK');
        const { redis } = await import('@/lib/redis');
        const result = await redis.setnx('lock-key', 'value');
        expect(mockIoRedisSet).toHaveBeenCalledWith('lock-key', 'value', 'NX');
        expect(result).toBe(true);
    });

    it('pipeline delegates to ioredis.pipeline', async () => {
        const mockPl = { exec: jest.fn() };
        mockIoRedisPipeline.mockReturnValueOnce(mockPl);
        const { redis } = await import('@/lib/redis');
        const pl = redis.pipeline();
        expect(mockIoRedisPipeline).toHaveBeenCalledTimes(1);
        expect(pl).toBe(mockPl);
    });

    it('reuses the same ioredis instance (singleton)', async () => {
        const { redis } = await import('@/lib/redis');
        mockIoRedisGet.mockResolvedValue('v');
        await redis.get('k1');
        await redis.get('k2');
        expect(mockIoRedisConstructor).toHaveBeenCalledTimes(1);
    });

    it('logs error events from ioredis', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        await import('@/lib/redis');

        const errorHandler = mockIoRedisOn.mock.calls.find(([event]) => event === 'error')?.[1];
        errorHandler?.(new Error('connection refused'));

        expect(consoleError).toHaveBeenCalledWith('[Redis]', 'connection refused');
        consoleError.mockRestore();
    });
});
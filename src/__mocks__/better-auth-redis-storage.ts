/**
 * CJS stub for `@better-auth/redis-storage`.
 *
 * The real package ships as ESM only (`dist/index.mjs`). Jest, running under
 * CJS via `next/jest`, cannot `require()` it. This stub is wired into
 * `jest.config.ts` under `moduleNameMapper`, alongside the other
 * `better-auth` family stubs, so any module that imports
 * `@better-auth/redis-storage` receives this object instead.
 *
 * The shape matches Better Auth's `SecondaryStorage` contract:
 *   { get(key): Promise<string | null>, set(key, value, ttl?): Promise<void>,
 *     delete(key): Promise<void> }
 *
 * The functions are intentionally trivial — `auth.test.ts` asserts on the
 * `betterAuth({...})` config, not on session-storage behavior. The real
 * adapter's behavior belongs in a dedicated `auth-redis-storage.test.ts`.
 */

const noopAsync = async (): Promise<void> => undefined;
const nullAsync = async (): Promise<string | null> => null;

export const redisStorage = (_options?: unknown) => ({
    get: nullAsync,
    set: noopAsync,
    delete: noopAsync,
});

export default { redisStorage };
/**
 * User-scoped browser storage.
 *
 * Rule: anything in localStorage that belongs to a signed-in *user* (drafts,
 * per-user UI counters, cached user data) must live under a key that contains
 * that user's id, so a second user on the same browser can never read it, and
 * so it can be removed on sign-out without touching browser-level preferences
 * (language, cookie consent, theme, sidebar state).
 *
 * Key format:  cnersh:<namespace>:<userId>:<name>
 *   cnersh:feed:<userId>:share-counts
 *   cnersh:draft:<userId>:<name>
 *   cnersh:user-data:<userId>:<name>
 *
 * The protocol wizard's existing key, `cnersh-protocol-draft:<userId>`, keeps
 * its format so drafts already saved in users' browsers are not lost; it is
 * recognizsign-out.tsed here as a user-scoped key.
 *
 * Authentication/session state must never be stored here. The session lives
 * only in Better Auth's HttpOnly cookie.
 */

export type StorageNamespace = "feed" | "draft" | "user-data";

/** `<namespace>:<name>`, for example `feed:share-counts`. */
export type UserStorageKey = `${StorageNamespace}:${string}`;

const ROOT = "cnersh";

/** Existing protocol-draft key prefix (format `<prefix>:<userId>`). */
export const PROTOCOL_DRAFT_PREFIX = "cnersh-protocol-draft";

/**
 * Keys written by older releases under one global name. They cannot be
 * attributed to a user, so they are deleted rather than adopted.
 */
export const LEGACY_GLOBAL_KEYS = ["feed-share-counts"] as const;

const NAMESPACE_PREFIXES: readonly string[] = [
    `${ROOT}:feed:`,
    `${ROOT}:draft:`,
    `${ROOT}:user-data:`,
];

const USER_SCOPED_PREFIXES: readonly string[] = [
    ...NAMESPACE_PREFIXES,
    `${PROTOCOL_DRAFT_PREFIX}:`,
];

function isValidUserId(userId: unknown): userId is string {
    return typeof userId === "string" && userId.length > 0 && !userId.includes(":");
}

function getStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage;
    } catch {
        // Storage can be disabled or partitioned.
        return null;
    }
}

function listKeys(storage: Storage): string[] {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key !== null) keys.push(key);
    }
    return keys;
}

/** Build the storage key for one user. Throws on an invalid user id. */
export function getUserKey(userId: string, key: UserStorageKey): string {
    if (!isValidUserId(userId)) {
        throw new Error("getUserKey requires a non-empty user id without ':'");
    }
    const separator = key.indexOf(":");
    const namespace = key.slice(0, separator);
    const name = key.slice(separator + 1);
    return `${ROOT}:${namespace}:${userId}:${name}`;
}

/** Read a JSON value for a user. Returns `fallback` if missing or unreadable. */
export function readUserJson<T>(userId: string, key: UserStorageKey, fallback: T): T {
    const storage = getStorage();
    if (!storage || !isValidUserId(userId)) return fallback;
    try {
        const raw = storage.getItem(getUserKey(userId, key));
        return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
        return fallback;
    }
}

/** Write a JSON value for a user. Best-effort: failures are swallowed. */
export function writeUserJson(userId: string, key: UserStorageKey, value: unknown): void {
    const storage = getStorage();
    if (!storage || !isValidUserId(userId)) return;
    try {
        storage.setItem(getUserKey(userId, key), JSON.stringify(value));
    } catch {
        // Quota exceeded or storage disabled.
    }
}

function removeWhere(predicate: (key: string) => boolean): void {
    const storage = getStorage();
    if (!storage) return;
    try {
        for (const key of listKeys(storage)) {
            if (predicate(key)) storage.removeItem(key);
        }
    } catch {
        // Best-effort cleanup.
    }
}

/**
 * Remove everything stored for one user. Leaves other users' keys and all
 * browser-level preferences untouched. No-op for an invalid user id.
 */
export function clearUserStorage(userId: string): void {
    if (!isValidUserId(userId)) return;
    removeWhere((key) => isOwnedBy(key, userId));
}

function isUserScopedKey(key: string): boolean {
    return USER_SCOPED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * True if `key` belongs to `userId`. The namespaced prefixes end in ":" so a
 * prefix match is safe; the protocol draft key has no trailing delimiter, so
 * it must be compared exactly. Otherwise "user-1" would also match the draft
 * of "user-10".
 */
function isOwnedBy(key: string, userId: string): boolean {
    if (key === `${PROTOCOL_DRAFT_PREFIX}:${userId}`) return true;
    return NAMESPACE_PREFIXES.some((prefix) => key.startsWith(`${prefix}${userId}:`));
}

/**
 * Remove user-scoped keys for every user, plus legacy global keys. Used when
 * the current user's id is unknown at sign-out (for example, the session had
 * already expired). Browser-level preferences are not touched.
 */
export function clearAllUserStorage(): void {
    removeWhere(
        (key) =>
            isUserScopedKey(key) || (LEGACY_GLOBAL_KEYS as readonly string[]).includes(key),
    );
}

/**
 * Remove every user-scoped key that does NOT belong to `keepUserId`, plus
 * legacy global keys. Run when a user is signed in so data left behind by a
 * previous user on the same browser (for example after the session expired
 * without a sign-out) is purged. No-op for an invalid user id.
 */
export function clearOtherUsersStorage(keepUserId: string): void {
    if (!isValidUserId(keepUserId)) return;
    removeWhere((key) => {
        if ((LEGACY_GLOBAL_KEYS as readonly string[]).includes(key)) return true;
        if (!isUserScopedKey(key)) return false;
        return !isOwnedBy(key, keepUserId);
    });
}
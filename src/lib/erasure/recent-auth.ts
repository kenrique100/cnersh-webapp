/** How recently the user must have signed in to authorise account deletion. */
export const RECENT_AUTH_WINDOW_MS = 15 * 60 * 1000;

/** True when a session created at `createdAt` is fresh enough for a sensitive action. */
export function isRecentSession(createdAt: Date | string | undefined | null, now = Date.now()): boolean {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    return Number.isFinite(created) && now - created <= RECENT_AUTH_WINDOW_MS;
}

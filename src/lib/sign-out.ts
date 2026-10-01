import { authClient } from "@/lib/auth-client";
import { clearAllUserStorage, clearUserStorage } from "@/lib/browser-storage";

/**
 * Sign out, remove the signed-out user's browser data, then do a full page
 * load so in-memory client state (auth store, router cache) cannot carry over
 * to the next person on this browser.
 *
 * Only user-scoped keys are removed (see browser-storage.ts); language,
 * cookie-consent, theme and sidebar preferences are kept.
 *
 * Throws if the server rejects the sign-out, in which case nothing is cleared
 * and the user stays signed in with their draft intact.
 */
export async function signOutAndClearBrowserData(
    redirectTo: string,
    navigate: (url: string) => void = (url) => window.location.assign(url),
): Promise<void> {
    let userId: string | undefined;
    try {
        const current = await authClient.getSession();
        userId = current?.data?.user?.id;
    } catch {
        // Fall through: user id unknown, clear all user-scoped keys instead.
    }

    const result = await authClient.signOut();
    if (result?.error) {
        throw new Error(result.error.message || "Sign out failed");
    }

    if (userId) {
        clearUserStorage(userId);
    } else {
        clearAllUserStorage();
    }

    navigate(redirectTo);
}
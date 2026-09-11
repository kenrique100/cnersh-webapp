/**
 * Browser-side state that belongs to the signed-in account and must not
 * survive sign-out or account deletion on a shared device. Language and
 * cookie-consent choices are device preferences and are intentionally kept.
 */
export const ACCOUNT_SCOPED_STORAGE_KEYS = [
    "cnersh-protocol-draft", // protocol wizard autosave (see protocol-form-wizard.tsx)
    "feed-share-counts",
] as const;

export function clearAccountScopedStorage(storage: Pick<Storage, "removeItem"> | undefined = globalThis.localStorage): void {
    if (!storage) return;
    for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
        try {
            storage.removeItem(key);
        } catch {
            // Storage can be unavailable (privacy mode); nothing else to do.
        }
    }
}

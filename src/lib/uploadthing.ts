import { UTApi } from "uploadthing/server";

let client: UTApi | undefined;

export function getUtapi(): UTApi {
    if (!client) {
        client = new UTApi();
    }
    return client;
}

type LazyMethod = "uploadFiles" | "deleteFiles";
function lazy<K extends LazyMethod>(method: K): UTApi[K] {
    return ((...args: unknown[]) => {
        const api = getUtapi();
        return (api[method] as (...forwarded: unknown[]) => unknown).apply(api, args);
    }) as UTApi[K];
}

export const utapi: Pick<UTApi, LazyMethod> = {
    uploadFiles: lazy("uploadFiles"),
    deleteFiles: lazy("deleteFiles"),
};

/**
 * Signs a private UploadThing object for a short-lived, direct read.
 *
 * The method used to sign varies by SDK version:
 *   - uploadthing v7+      : utapi.getSignedUrl(key, { expiresIn })
 *   - some earlier builds  : utapi.generateSignedUrl(key, { expiresIn })
 *   - very early builds    : no built-in signing; you must sign via the
 *                            UFS client or a manual HMAC.
 *
 * This helper calls the v7 form and fails safely if it is not present.
 * When null is returned, callers MUST NOT fall back to the raw object URL
 * for private files, or the object would be exposed unsigned.
 */
export async function getSignedUrl(
    storageKey: string,
    expiresInSeconds: number,
): Promise<string | null> {
    const api = getUtapi() as unknown as {
        getSignedUrl?: (
            key: string,
            opts: { expiresIn: number },
        ) => Promise<string>;
    };

    if (typeof api.getSignedUrl !== "function") {
        console.error(
            "[uploadthing] getSignedUrl is not available in the installed SDK. " +
            "Private file access cannot be signed. Verify the `uploadthing` " +
            "version in package.json exposes a signing method.",
        );
        return null;
    }

    try {
        return await api.getSignedUrl(storageKey, { expiresIn: expiresInSeconds });
    } catch (err) {
        console.error("[uploadthing] failed to sign URL for key:", storageKey, err);
        return null;
    }
}
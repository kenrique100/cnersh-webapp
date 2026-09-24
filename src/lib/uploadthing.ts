import { UTApi } from "uploadthing/server";

/**
 * Resolve the UploadThing API key from environment variables.
 *
 * Supports two env-var layouts:
 *   1. UPLOADTHING_SECRET  – raw `sk_live_…` key  (v6 convention)
 *   2. UPLOADTHING_TOKEN   – base64-encoded JWT   (v7 convention)
 *      The JWT payload has the shape `{ apiKey: "sk_live_…", … }`.
 *
 * If UPLOADTHING_SECRET is already present, we use it directly.
 * Otherwise we decode UPLOADTHING_TOKEN, extract `apiKey`, and
 * set UPLOADTHING_SECRET so that the UTApi constructor picks it up
 * automatically.
 */
function resolveUploadThingApiKey(): string {
    // Fast path: legacy env var is already set
    if (process.env.UPLOADTHING_SECRET) {
        return process.env.UPLOADTHING_SECRET;
    }

    const token = process.env.UPLOADTHING_TOKEN;
    if (!token) {
        throw new Error(
            "Missing UploadThing credentials. " +
            "Set either UPLOADTHING_SECRET (sk_…) or UPLOADTHING_TOKEN (JWT).",
        );
    }

    try {
        // The token is a standard base64-encoded JSON payload (not a full
        // 3-part JWT – UploadThing uses a single base64 blob).
        const decoded = JSON.parse(
            Buffer.from(token, "base64").toString("utf-8"),
        ) as { apiKey?: string };

        if (!decoded.apiKey || !decoded.apiKey.startsWith("sk_")) {
            throw new Error("Decoded token does not contain a valid apiKey starting with 'sk_'");
        }

        // Inject into the environment so UTApi (and any other UploadThing
        // internals) find it automatically on future accesses.
        process.env.UPLOADTHING_SECRET = decoded.apiKey;
        return decoded.apiKey;
    } catch (err) {
        throw new Error(
            `Failed to decode UPLOADTHING_TOKEN: ${err instanceof Error ? err.message : String(err)}`,
        );
    }
}

let client: UTApi | undefined;

export function getUtapi(): UTApi {
    if (!client) {
        // Ensure the secret is available before constructing the client.
        resolveUploadThingApiKey();
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

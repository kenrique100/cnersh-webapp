import { UTApi } from "uploadthing/server";

/**
 * UploadThing server client, constructed on first use.
 *
 * `new UTApi()` reads UPLOADTHING_SECRET immediately and throws when it is
 * missing or does not start with `sk_`. Constructing it at module level made
 * that secret a build-time requirement: `next build` imports every route while
 * collecting page data, so a deploy with the key absent failed at
 * `/api/delete-blob` before the application ever ran.
 *
 * Deferring construction keeps the runtime behaviour identical (a missing key
 * still fails the first upload or deletion) while letting builds succeed in
 * environments that do not carry production secrets, such as CI.
 */
let client: UTApi | undefined;

export function getUtapi(): UTApi {
    if (!client) {
        client = new UTApi();
    }
    return client;
}

type LazyMethod = "uploadFiles" | "deleteFiles";

/**
 * Forwards a call to the lazily created client while keeping the method's own
 * type, including its overloads (`uploadFiles` accepts one file or an array
 * and returns a matching shape), which a plain rest-parameter wrapper loses.
 */
function lazy<K extends LazyMethod>(method: K): UTApi[K] {
    return ((...args: unknown[]) => {
        const api = getUtapi();
        return (api[method] as (...forwarded: unknown[]) => unknown).apply(api, args);
    }) as UTApi[K];
}

/**
 * Same surface the rest of the codebase already uses. Each call resolves the
 * real client lazily, so importing this module never touches the environment.
 */
export const utapi: Pick<UTApi, LazyMethod> = {
    uploadFiles: lazy("uploadFiles"),
    deleteFiles: lazy("deleteFiles"),
};

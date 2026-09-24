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
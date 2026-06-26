export interface BunnyUploadResult {
    url: string;
    storageKey: string;
}

export function sanitizeStorageKey(input: string): string | null {
    const key = input.trim();
    if (!key) return null;
    if (key.includes("\\")) return null;
    if (/[\u0000-\u001F\u007F]/.test(key)) return null;

    const normalized = key.replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
    if (!normalized) return null;

    const segments = normalized.split("/");
    if (segments.some((s) => s.length === 0 || s === "." || s === "..")) return null;

    return segments.join("/");
}

function buildBunnyStorageUrl(apiUrl: string, zone: string, storageKey: string): string {
    const base = new URL(`https://${apiUrl}/`);
    const encodedPath = [zone, ...storageKey.split("/")]
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return new URL(encodedPath, base).toString();
}

export async function uploadFileToBunny(
    fileBuffer: Buffer,
    filename: string,
    folder: string
): Promise<BunnyUploadResult> {
    const zone = process.env.BUNNY_STORAGE_ZONE!;
    const password = process.env.BUNNY_STORAGE_PASSWORD!;
    const apiUrl = process.env.BUNNY_STORAGE_API_URL!;
    const pullUrl = process.env.BUNNY_PULL_ZONE_URL!;

    const unsafeStorageKey = `${folder}/${Date.now()}-${filename}`;
    const storageKey = sanitizeStorageKey(unsafeStorageKey);
    if (!storageKey) {
        throw new Error("Invalid storage key");
    }
    const endpoint = buildBunnyStorageUrl(apiUrl, zone, storageKey);

    const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
            AccessKey: password,
            "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array(fileBuffer),
    });

    if (!response.ok) {
        throw new Error(`BunnyCDN upload failed: ${response.status}`);
    }

    return {
        url: `${pullUrl}/${storageKey}`,
        storageKey,
    };
}

export async function deleteFileFromBunny(storageKey: string): Promise<void> {
    const zone = process.env.BUNNY_STORAGE_ZONE!;
    const password = process.env.BUNNY_STORAGE_PASSWORD!;
    const apiUrl = process.env.BUNNY_STORAGE_API_URL!;

    const safeStorageKey = sanitizeStorageKey(storageKey);
    if (!safeStorageKey) {
        throw new Error("Invalid storage key");
    }
    const endpoint = buildBunnyStorageUrl(apiUrl, zone, safeStorageKey);

    const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
            AccessKey: password,
        },
    });

    if (!response.ok && response.status !== 404) {
        throw new Error(`BunnyCDN delete failed: ${response.status}`);
    }
}

export function storageKeyFromUrl(url: string): string | null {
    const pullUrl = process.env.BUNNY_PULL_ZONE_URL;
    if (!pullUrl) return null;

    try {
        const pull = new URL(pullUrl.endsWith("/") ? pullUrl : pullUrl + "/");
        const candidate = new URL(url);

        if (candidate.origin !== pull.origin) return null;
        if (!candidate.pathname.startsWith(pull.pathname)) return null;

        const rawKey = candidate.pathname.slice(pull.pathname.length);
        return sanitizeStorageKey(rawKey);
    } catch {
        return null;
    }
}

export function isBunnyUrl(url: string): boolean {
    const pullUrl = process.env.BUNNY_PULL_ZONE_URL;
    if (!pullUrl) return false;
    return url.startsWith(pullUrl);
}
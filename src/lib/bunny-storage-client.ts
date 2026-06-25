export interface BunnyUploadResult {
    url: string;
    storageKey: string;
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

    const storageKey = `${folder}/${Date.now()}-${filename}`;
    const endpoint = `https://${apiUrl}/${zone}/${storageKey}`;

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

    const endpoint = `https://${apiUrl}/${zone}/${storageKey}`;

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
    const pullUrl = process.env.BUNNY_PULL_ZONE_URL ?? "";
    const base = pullUrl.endsWith("/") ? pullUrl : pullUrl + "/";

    if (url.startsWith(base)) {
        return url.slice(base.length);
    }

    try {
        const { pathname } = new URL(url);
        return pathname.startsWith("/") ? pathname.slice(1) : pathname;
    } catch {
        return null;
    }
}

export function isBunnyUrl(url: string): boolean {
    const pullUrl = process.env.BUNNY_PULL_ZONE_URL;
    if (!pullUrl) return false;
    return url.startsWith(pullUrl);
}
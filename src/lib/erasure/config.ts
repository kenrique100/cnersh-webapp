/**
 * Configuration for per-user envelope encryption and cryptographic erasure.
 *
 * Nothing in this module touches the environment at import time: `next build`
 * imports every route while collecting page data, and the erasure key material
 * must never become a build-time requirement (see src/lib/uploadthing.ts for
 * the same reasoning).
 *
 * Environment variables
 *   ERASURE_KEK             base64 32-byte key-encryption key (current)
 *   ERASURE_KEK_ID          identifier stored next to every wrapped key
 *                           (default "kek-1"); change it when rotating
 *   ERASURE_KEK_PREVIOUS    optional comma separated `id:base64` pairs that
 *                           may still unwrap older keys during a rotation
 *   ERASURE_STORE_URL       PostgreSQL URL for the key store and deletion
 *                           journal. Point this at a database with its own
 *                           backup policy so destroyed keys do not come back
 *                           with an application-database restore. Falls back
 *                           to DIRECT_URL/DATABASE_URL with a capability flag
 *                           that the UI and docs use to stay honest.
 *   ERASURE_HMAC_KEY        optional base64 key used to pseudonymise the email
 *                           of erased accounts inside the journal
 */

export const DEFAULT_KEK_ID = "kek-1";

export interface KekMaterial {
    id: string;
    key: Buffer;
}

export interface ErasureConfig {
    currentKek: KekMaterial;
    previousKeks: KekMaterial[];
    storeUrl: string;
    /** True when the erasure store is not the application database. */
    storeIsolated: boolean;
    hmacKey: Buffer | null;
}

export class ErasureNotConfiguredError extends Error {
    constructor(message = "Cryptographic erasure is not configured (ERASURE_KEK is missing)") {
        super(message);
        this.name = "ErasureNotConfiguredError";
    }
}

function decodeKey(name: string, value: string): Buffer {
    const buffer = Buffer.from(value.trim(), "base64");
    if (buffer.length !== 32) {
        throw new Error(`${name} must be a base64 encoded 32-byte key`);
    }
    return buffer;
}

function parsePreviousKeks(raw: string | undefined): KekMaterial[] {
    if (!raw?.trim()) return [];
    return raw
        .split(",")
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
            const separator = pair.indexOf(":");
            if (separator <= 0) {
                throw new Error("ERASURE_KEK_PREVIOUS entries must look like `kek-id:base64key`");
            }
            const id = pair.slice(0, separator).trim();
            return { id, key: decodeKey(`ERASURE_KEK_PREVIOUS[${id}]`, pair.slice(separator + 1)) };
        });
}

function normaliseUrl(url: string): string {
    try {
        const parsed = new URL(url);
        parsed.search = "";
        return parsed.toString().replace(/\/$/, "");
    } catch {
        return url.trim();
    }
}

/** True when ERASURE_KEK is present, regardless of whether it is valid. */
export function isErasureConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
    return Boolean(env.ERASURE_KEK?.trim());
}

/**
 * Parse and validate the erasure configuration. Throws
 * ErasureNotConfiguredError when the KEK is absent so callers can fail closed
 * with a stable error type.
 */
export function loadErasureConfig(env: NodeJS.ProcessEnv = process.env): ErasureConfig {
    if (!isErasureConfigured(env)) {
        throw new ErasureNotConfiguredError();
    }

    const currentKek: KekMaterial = {
        id: env.ERASURE_KEK_ID?.trim() || DEFAULT_KEK_ID,
        key: decodeKey("ERASURE_KEK", env.ERASURE_KEK as string),
    };
    const previousKeks = parsePreviousKeks(env.ERASURE_KEK_PREVIOUS).filter(
        (kek) => kek.id !== currentKek.id
    );

    const appUrl = env.DIRECT_URL || env.DATABASE_URL || "";
    const storeUrl = env.ERASURE_STORE_URL?.trim() || appUrl;
    if (!storeUrl) {
        throw new Error("ERASURE_STORE_URL or DATABASE_URL must be set for the erasure store");
    }

    const appUrls = [env.DIRECT_URL, env.DATABASE_URL].filter(Boolean).map((u) => normaliseUrl(u as string));
    const storeIsolated = !appUrls.includes(normaliseUrl(storeUrl));

    const hmacKey = env.ERASURE_HMAC_KEY?.trim() ? decodeKey("ERASURE_HMAC_KEY", env.ERASURE_HMAC_KEY) : null;

    return { currentKek, previousKeks, storeUrl, storeIsolated, hmacKey };
}

export interface ErasureCapabilities {
    configured: boolean;
    storeIsolated: boolean;
    kekId: string | null;
}

/** Capability summary for UI copy, docs, and health reporting. Never throws. */
export function getErasureCapabilities(env: NodeJS.ProcessEnv = process.env): ErasureCapabilities {
    try {
        const config = loadErasureConfig(env);
        return { configured: true, storeIsolated: config.storeIsolated, kekId: config.currentKek.id };
    } catch {
        return { configured: false, storeIsolated: false, kekId: null };
    }
}

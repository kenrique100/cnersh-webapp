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
    /**
     * Conservative URL-based isolation hint, NOT proof of independent backup
     * history. Operators must verify the store is excluded from application
     * restores. Neon URLs alone cannot establish separate projects/history.
     */
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

interface DatabaseDestination {
    host: string;
    port: string;
    database: string;
    neon: boolean;
}

function databaseDestination(url: string): DatabaseDestination | null {
    try {
        const parsed = new URL(url);
        if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname) return null;

        // An omitted database defaults to the username in PostgreSQL; a role
        // change must never be treated as evidence of isolation. Reject
        // ambiguous connection overrides rather than guessing driver behavior.
        const database = decodeURIComponent(parsed.pathname.slice(1));
        if (!database || /[\/\0]/.test(database)) return null;
        if (["host", "hostaddr", "port", "dbname", "database", "service", "servicefile"].some((key) => parsed.searchParams.has(key))) {
            return null;
        }

        let host = parsed.hostname.toLowerCase().replace(/\.$/, "");
        const neon = host.endsWith(".neon.tech");
        if (neon) {
            // Direct and pooled hosts refer to the same Neon endpoint.
            host = host.replace(/-pooler(?=\.)/, "");
        }
        // Credentials, protocol aliases, SSL options and other connection
        // settings do not identify a different database.
        return { host, port: parsed.port || "5432", database, neon };
    } catch {
        return null;
    }
}

function destinationsAreIsolated(store: DatabaseDestination, app: DatabaseDestination): boolean {
    if (store.neon && app.neon) {
        // Neon restores every database in a branch together, not just the
        // database named in the URL, so database names and ports cannot make
        // one endpoint isolated. Distinct endpoints are only a logical
        // separation hint: they may still share project/branch history.
        // Independent projects/backups must be verified by the operator.
        return store.host !== app.host;
    }
    // For generic PostgreSQL this remains a logical-database heuristic, so two
    // local databases can exercise an app-only pg_dump/pg_restore drill. It
    // cannot prove independent physical backups or resolve host aliases.
    return store.host !== app.host || store.port !== app.port || store.database !== app.database;
}

/**
 * URL-based equality for an individual database, not backup isolation.
 * Used by destructive CLI preflight to keep pooled/direct app connections on
 * one target. Unknown destinations are never accepted as a match.
 */
export function isSameDatabaseDestination(firstUrl: string, secondUrl: string): boolean {
    const first = databaseDestination(firstUrl);
    const second = databaseDestination(secondUrl);
    return first !== null && second !== null
        && first.host === second.host
        && first.port === second.port
        && first.database === second.database;
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

    const appUrls = [env.DIRECT_URL, env.DATABASE_URL]
        .map((url) => url?.trim())
        .filter((url): url is string => Boolean(url));
    const appUrl = appUrls[0] || "";
    const storeUrl = env.ERASURE_STORE_URL?.trim() || appUrl;
    if (!storeUrl) {
        throw new Error("ERASURE_STORE_URL or DATABASE_URL must be set for the erasure store");
    }

    const storeDestination = databaseDestination(storeUrl);
    const storeIsolated = storeDestination !== null && appUrls.length > 0 && appUrls.every((url) => {
        const appDestination = databaseDestination(url);
        return appDestination !== null && destinationsAreIsolated(storeDestination, appDestination);
    });

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

/**
 * Erasure store: per-subject wrapped keys and the deletion journal.
 *
 * Deliberately implemented with the `pg` driver instead of the Prisma client so
 * it can point at a different database (ERASURE_STORE_URL) than the
 * application. That separation is what lets a destroyed key stay destroyed and
 * a journal entry stay authoritative when the application database is rolled
 * back to a backup. The tables mirror the Prisma models ErasureSubjectKey and
 * ErasureJournalEntry so the fallback (same database) case is covered by the
 * regular migration; scripts/sql/erasure-store.sql creates them elsewhere.
 */

import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { loadErasureConfig } from "./config";

// Defined at the store layer so even direct store callers cannot destroy it.
export const INSTITUTION_SUBJECT = "institution-records";

/** Stable, fail-closed result for write-key requests after durable revocation. */
export class SubjectKeyRevokedError extends Error {
    readonly code = "SUBJECT_KEY_REVOKED";

    constructor(public readonly subjectId: string) {
        super("The subject's encryption key has been revoked for new writes");
        this.name = "SubjectKeyRevokedError";
    }
}

export type JournalStatus = "ACCEPTED" | "COMPLETED" | "BLOCKED";

export interface SubjectKeyRecord {
    subjectId: string;
    keyVersion: number;
    kekId: string;
    wrappedDek: Buffer;
    createdAt: Date;
    rotatedAt: Date | null;
}

export interface JournalEntry {
    id: string;
    subjectId: string;
    emailHmac: string | null;
    status: JournalStatus;
    requestedVia: string;
    requestedAt: Date;
    keyDestroyedAt: Date | null;
    completedAt: Date | null;
    lastReconciledAt: Date | null;
    details: Record<string, unknown> | null;
}

interface Queryable {
    query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
}

const globalForStore = globalThis as unknown as {
    __erasurePool?: Pool;
    __erasurePoolUrl?: string;
    __erasureTestPool?: Pool;
};

function getPool(): Pool {
    if (globalForStore.__erasureTestPool) return globalForStore.__erasureTestPool;
    const { storeUrl } = loadErasureConfig();
    if (globalForStore.__erasurePool && globalForStore.__erasurePoolUrl === storeUrl) {
        return globalForStore.__erasurePool;
    }
    const pool = new Pool({
        connectionString: storeUrl,
        max: 4,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 15_000,
    });
    pool.on("error", (error) => console.error("[erasure-store] pool error:", error));
    globalForStore.__erasurePool = pool;
    globalForStore.__erasurePoolUrl = storeUrl;
    return pool;
}

/** Test seam: replace the pool (or restore the default when called with undefined). */
export function __setErasurePoolForTests(pool: Pool | undefined): void {
    globalForStore.__erasureTestPool = pool;
}

export async function closeErasureStore(): Promise<void> {
    const pools = new Set([globalForStore.__erasurePool, globalForStore.__erasureTestPool]);
    globalForStore.__erasurePool = undefined;
    globalForStore.__erasurePoolUrl = undefined;
    globalForStore.__erasureTestPool = undefined;
    await Promise.all([...pools].map((pool) => pool?.end()));
}

/**
 * Serialize key creation, deletion acceptance, and destruction across workers.
 * READ COMMITTED is explicit: the tombstone query after a lock wait must see
 * the previous holder's commit, not a pre-wait transaction snapshot.
 *
 * Lock order is this advisory lock, then erasure-store rows only. Never access
 * the application database or call application callbacks inside this helper.
 */
async function withSubjectLock<T>(subjectId: string, operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    let releaseError: Error | undefined;
    try {
        await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
        // Hash collisions only serialize unrelated subjects; they cannot bypass revocation.
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`erasure-subject:${subjectId}`]);
        const result = await operation(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            // A connection that could still hold a transaction must not rejoin the pool.
            releaseError = rollbackError instanceof Error ? rollbackError : new Error("Erasure transaction rollback failed");
        }
        throw error;
    } finally {
        client.release(releaseError);
    }
}

/** Round-trip to the store; used by health checks and preflight scripts. */
export async function pingErasureStore(): Promise<boolean> {
    const result = await getPool().query("SELECT 1 AS ok");
    return result.rows.length === 1;
}

// ── Subject keys ──────────────────────────────────────────────────────────────

function mapKeyRow(row: QueryResultRow): SubjectKeyRecord {
    return {
        subjectId: row.subjectId,
        keyVersion: Number(row.keyVersion),
        kekId: row.kekId,
        wrappedDek: Buffer.from(row.wrappedDek),
        createdAt: new Date(row.createdAt),
        rotatedAt: row.rotatedAt ? new Date(row.rotatedAt) : null,
    };
}

export async function readSubjectKey(subjectId: string, client: Queryable = getPool()): Promise<SubjectKeyRecord | null> {
    const result = await client.query(
        `SELECT "subjectId", "keyVersion", "kekId", "wrappedDek", "createdAt", "rotatedAt"
           FROM "erasure_subject_key" WHERE "subjectId" = $1`,
        [subjectId]
    );
    return result.rows[0] ? mapKeyRow(result.rows[0]) : null;
}

/**
 * Insert a wrapped key unless one already exists. Returns the row that ended
 * up in the store, which makes concurrent first writes safe: both callers get
 * the same key. Any journal row is an irreversible write-key revocation,
 * regardless of status, including while retention re-keying is still pending.
 */
export async function insertSubjectKeyIfAbsent(
    record: Pick<SubjectKeyRecord, "subjectId" | "kekId" | "wrappedDek">
): Promise<SubjectKeyRecord> {
    return withSubjectLock(record.subjectId, async (client) => {
        if (await readJournalEntry(record.subjectId, client)) {
            throw new SubjectKeyRevokedError(record.subjectId);
        }
        const inserted = await client.query(
            `INSERT INTO "erasure_subject_key" ("subjectId", "keyVersion", "kekId", "wrappedDek", "createdAt")
             VALUES ($1, 1, $2, $3, NOW())
             ON CONFLICT ("subjectId") DO NOTHING
             RETURNING "subjectId", "keyVersion", "kekId", "wrappedDek", "createdAt", "rotatedAt"`,
            [record.subjectId, record.kekId, record.wrappedDek]
        );
        if (inserted.rows[0]) return mapKeyRow(inserted.rows[0]);
        const existing = await readSubjectKey(record.subjectId, client);
        if (!existing) throw new Error(`Key for ${record.subjectId} vanished during insert`);
        return existing;
    });
}

/** Re-wrap under a new KEK without changing the DEK or key version. */
export async function updateSubjectKeyWrapping(subjectId: string, kekId: string, wrappedDek: Buffer): Promise<void> {
    await getPool().query(
        `UPDATE "erasure_subject_key" SET "kekId" = $2, "wrappedDek" = $3, "rotatedAt" = NOW() WHERE "subjectId" = $1`,
        [subjectId, kekId, wrappedDek]
    );
}

/**
 * Permanently revoke and remove the wrapped key. The tombstone and deletion
 * commit atomically, even if no deletion request was recorded beforehand.
 * Existing journal metadata/completion is preserved. Returns whether a key
 * row was removed, not whether application-level erasure is complete.
 */
export async function deleteSubjectKey(subjectId: string): Promise<boolean> {
    if (subjectId === INSTITUTION_SUBJECT) {
        throw new Error("Refusing to destroy the institutional records key");
    }
    return withSubjectLock(subjectId, async (client) => {
        await insertDeletionIntent(
            { subjectId, emailHmac: null, requestedVia: "KEY_DESTRUCTION" },
            client
        );
        const result = await client.query(`DELETE FROM "erasure_subject_key" WHERE "subjectId" = $1`, [subjectId]);
        return (result.rowCount ?? 0) > 0;
    });
}

export async function listSubjectKeys(limit = 1000, after?: string): Promise<SubjectKeyRecord[]> {
    const result = after
        ? await getPool().query(
              `SELECT "subjectId", "keyVersion", "kekId", "wrappedDek", "createdAt", "rotatedAt"
                 FROM "erasure_subject_key" WHERE "subjectId" > $1 ORDER BY "subjectId" LIMIT $2`,
              [after, limit]
          )
        : await getPool().query(
              `SELECT "subjectId", "keyVersion", "kekId", "wrappedDek", "createdAt", "rotatedAt"
                 FROM "erasure_subject_key" ORDER BY "subjectId" LIMIT $1`,
              [limit]
          );
    return result.rows.map(mapKeyRow);
}

// ── Journal ───────────────────────────────────────────────────────────────────

function mapJournalRow(row: QueryResultRow): JournalEntry {
    return {
        id: row.id,
        subjectId: row.subjectId,
        emailHmac: row.emailHmac ?? null,
        status: row.status,
        requestedVia: row.requestedVia,
        requestedAt: new Date(row.requestedAt),
        keyDestroyedAt: row.keyDestroyedAt ? new Date(row.keyDestroyedAt) : null,
        completedAt: row.completedAt ? new Date(row.completedAt) : null,
        lastReconciledAt: row.lastReconciledAt ? new Date(row.lastReconciledAt) : null,
        details: (row.details as Record<string, unknown> | null) ?? null,
    };
}

const JOURNAL_COLUMNS = `"id", "subjectId", "emailHmac", "status", "requestedVia", "requestedAt",
    "keyDestroyedAt", "completedAt", "lastReconciledAt", "details"`;

/**
 * Record the intent to delete. Idempotent per subject: a second call returns
 * the existing entry so retries after a crash do not create duplicates.
 */
export async function recordDeletionIntent(input: {
    subjectId: string;
    emailHmac: string | null;
    requestedVia: string;
}): Promise<JournalEntry> {
    if (input.subjectId === INSTITUTION_SUBJECT) {
        throw new Error("Refusing to revoke the institutional records key");
    }
    return withSubjectLock(input.subjectId, (client) => insertDeletionIntent(input, client));
}

/** Caller must already hold the subject lock; do not nest transactions. */
async function insertDeletionIntent(input: {
    subjectId: string;
    emailHmac: string | null;
    requestedVia: string;
}, client: Queryable): Promise<JournalEntry> {
    const inserted = await client.query(
        `INSERT INTO "erasure_journal" ("id", "subjectId", "emailHmac", "status", "requestedVia", "requestedAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'ACCEPTED', $3, NOW(), NOW())
         ON CONFLICT ("subjectId") DO NOTHING
         RETURNING ${JOURNAL_COLUMNS}`,
        [input.subjectId, input.emailHmac, input.requestedVia]
    );
    if (inserted.rows[0]) return mapJournalRow(inserted.rows[0]);
    const existing = await readJournalEntry(input.subjectId, client);
    if (!existing) throw new Error(`Journal entry for ${input.subjectId} vanished during insert`);
    return existing;
}

export async function readJournalEntry(subjectId: string, client: Queryable = getPool()): Promise<JournalEntry | null> {
    const result = await client.query(
        `SELECT ${JOURNAL_COLUMNS} FROM "erasure_journal" WHERE "subjectId" = $1`,
        [subjectId]
    );
    return result.rows[0] ? mapJournalRow(result.rows[0]) : null;
}

export async function markJournalKeyDestroyed(subjectId: string): Promise<void> {
    const result = await getPool().query(
        `UPDATE "erasure_journal" SET "keyDestroyedAt" = COALESCE("keyDestroyedAt", NOW()), "updatedAt" = NOW()
          WHERE "subjectId" = $1`,
        [subjectId]
    );
    if (!result.rowCount) throw new Error(`Journal entry for ${subjectId} is missing`);
}

export async function markJournalStatus(
    subjectId: string,
    status: JournalStatus,
    details?: Record<string, unknown>
): Promise<void> {
    const result = await getPool().query(
        `UPDATE "erasure_journal"
            SET "status" = $2,
                "completedAt" = CASE WHEN $2 = 'COMPLETED' THEN COALESCE("completedAt", NOW()) ELSE "completedAt" END,
                "details" = COALESCE($3::jsonb, "details"),
                "updatedAt" = NOW()
          WHERE "subjectId" = $1`,
        [subjectId, status, details ? JSON.stringify(details) : null]
    );
    if (!result.rowCount) throw new Error(`Journal entry for ${subjectId} is missing`);
}

export async function markJournalReconciled(subjectId: string): Promise<void> {
    const result = await getPool().query(
        `UPDATE "erasure_journal" SET "lastReconciledAt" = NOW(), "updatedAt" = NOW() WHERE "subjectId" = $1`,
        [subjectId]
    );
    if (!result.rowCount) throw new Error(`Journal entry for ${subjectId} is missing`);
}

export async function listJournalEntries(statuses: JournalStatus[] = ["ACCEPTED", "COMPLETED", "BLOCKED"]): Promise<JournalEntry[]> {
    const result = await getPool().query(
        `SELECT ${JOURNAL_COLUMNS} FROM "erasure_journal" WHERE "status" = ANY($1::text[]) ORDER BY "requestedAt" ASC`,
        [statuses]
    );
    return result.rows.map(mapJournalRow);
}

/**
 * Removes a journal entry. Journal entries are the durable record that a
 * deletion happened and must never be removed for real subjects; this exists
 * only so drills and tests can clean up the synthetic subjects they created.
 */
export async function deleteJournalEntryForFixture(subjectId: string): Promise<boolean> {
    if (!subjectId.startsWith("drill-") && !subjectId.startsWith("test-")) {
        throw new Error("Refusing to delete a journal entry for a non-fixture subject");
    }
    const result = await getPool().query(`DELETE FROM "erasure_journal" WHERE "subjectId" = $1`, [subjectId]);
    return (result.rowCount ?? 0) > 0;
}

export type { PoolClient };

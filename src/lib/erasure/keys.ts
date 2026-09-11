/**
 * Per-subject key lifecycle: create on first use, unwrap for reads, re-wrap on
 * KEK rotation, destroy on account deletion.
 *
 * A "subject" is normally a user id. The institutional subject holds the key
 * for records the ethics committee must retain after their author leaves
 * (see retention-policy.ts); it is never destroyed by the deletion service.
 */

import { loadErasureConfig } from "./config";
import { generateDek, unwrapDek, wrapDek } from "./crypto";
import {
    deleteSubjectKey,
    insertSubjectKeyIfAbsent,
    listSubjectKeys,
    readSubjectKey,
    updateSubjectKeyWrapping,
    type SubjectKeyRecord,
} from "./store";

export const INSTITUTION_SUBJECT = "institution-records";

export interface SubjectKey {
    subjectId: string;
    keyVersion: number;
    dek: Buffer;
}

interface CacheEntry {
    key: SubjectKey;
    expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, CacheEntry>();

function cacheGet(subjectId: string): SubjectKey | null {
    const entry = cache.get(subjectId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
        cache.delete(subjectId);
        return null;
    }
    return entry.key;
}

function cacheSet(key: SubjectKey): void {
    if (cache.size >= CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
    }
    cache.set(key.subjectId, { key, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Drop a subject from the in-process cache. Called on destruction and by tests. */
export function forgetSubjectKey(subjectId?: string): void {
    if (subjectId) cache.delete(subjectId);
    else cache.clear();
}

function kekById(kekId: string): Buffer {
    const config = loadErasureConfig();
    if (config.currentKek.id === kekId) return config.currentKek.key;
    const previous = config.previousKeks.find((kek) => kek.id === kekId);
    if (!previous) {
        throw new Error(`No KEK available for id "${kekId}"; set ERASURE_KEK_PREVIOUS during rotation`);
    }
    return previous.key;
}

function unwrapRecord(record: SubjectKeyRecord): SubjectKey {
    const dek = unwrapDek(kekById(record.kekId), record.wrappedDek, record.subjectId, record.kekId);
    return { subjectId: record.subjectId, keyVersion: record.keyVersion, dek };
}

/** Return the subject's key, or null if it has never existed or was destroyed. */
export async function getSubjectKey(subjectId: string): Promise<SubjectKey | null> {
    const cached = cacheGet(subjectId);
    if (cached) return cached;
    const record = await readSubjectKey(subjectId);
    if (!record) return null;
    const key = unwrapRecord(record);
    cacheSet(key);
    return key;
}

/**
 * Return the subject's key, creating one when the subject has none. Creation is
 * a conditional insert, so concurrent first writes converge on one key.
 */
export async function getOrCreateSubjectKey(subjectId: string): Promise<SubjectKey> {
    const existing = await getSubjectKey(subjectId);
    if (existing) return existing;

    const config = loadErasureConfig();
    const dek = generateDek();
    const record = await insertSubjectKeyIfAbsent({
        subjectId,
        kekId: config.currentKek.id,
        wrappedDek: wrapDek(config.currentKek.key, dek, subjectId, config.currentKek.id),
    });
    const key = unwrapRecord(record);
    cacheSet(key);
    return key;
}

/**
 * Destroy the subject's key. Returns whether a key was present. Callers must
 * verify with `getSubjectKey(subjectId) === null` afterwards before reporting
 * erasure; this function does not claim success on its own.
 */
export async function destroySubjectKey(subjectId: string): Promise<boolean> {
    if (subjectId === INSTITUTION_SUBJECT) {
        throw new Error("Refusing to destroy the institutional records key");
    }
    forgetSubjectKey(subjectId);
    const removed = await deleteSubjectKey(subjectId);
    forgetSubjectKey(subjectId);
    return removed;
}

/** Confirm destruction by reading through to the store, bypassing the cache. */
export async function verifySubjectKeyDestroyed(subjectId: string): Promise<boolean> {
    forgetSubjectKey(subjectId);
    return (await readSubjectKey(subjectId)) === null;
}

/**
 * Re-wrap every stored key under the current KEK. Used by
 * scripts/rotate-erasure-kek.ts after ERASURE_KEK is rotated and the previous
 * key moved to ERASURE_KEK_PREVIOUS. DEKs and ciphertexts are unchanged.
 */
export async function rewrapAllSubjectKeys(onProgress?: (done: number) => void): Promise<number> {
    const config = loadErasureConfig();
    let after: string | undefined;
    let rewrapped = 0;
    for (;;) {
        const batch = await listSubjectKeys(500, after);
        if (batch.length === 0) break;
        for (const record of batch) {
            if (record.kekId !== config.currentKek.id) {
                const { dek } = unwrapRecord(record);
                await updateSubjectKeyWrapping(
                    record.subjectId,
                    config.currentKek.id,
                    wrapDek(config.currentKek.key, dek, record.subjectId, config.currentKek.id)
                );
                forgetSubjectKey(record.subjectId);
                rewrapped += 1;
                onProgress?.(rewrapped);
            }
        }
        after = batch[batch.length - 1].subjectId;
    }
    return rewrapped;
}

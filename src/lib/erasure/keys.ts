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
    INSTITUTION_SUBJECT,
    insertSubjectKeyIfAbsent,
    listSubjectKeys,
    readSubjectKey,
    updateSubjectKeyWrapping,
    type SubjectKeyRecord,
} from "./store";

export { INSTITUTION_SUBJECT, SubjectKeyRevokedError } from "./store";

export interface SubjectKey {
    subjectId: string;
    keyVersion: number;
    dek: Buffer;
}

/**
 * Compatibility no-op: DEKs are no longer cached in this process. This cannot
 * revoke buffers already returned to callers, including reads in flight.
 */
export function forgetSubjectKey(_subjectId?: string): void {} // eslint-disable-line @typescript-eslint/no-unused-vars

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

/**
 * Read through to the store every time. Accepted deletion intents still allow
 * reads until destruction so retained records can be re-keyed.
 */
export async function getSubjectKey(subjectId: string): Promise<SubjectKey | null> {
    const record = await readSubjectKey(subjectId);
    return record ? unwrapRecord(record) : null;
}

/**
 * Obtain a key for a write, creating one when the subject has none. Always use
 * the store's guarded operation, including for existing keys: a durable
 * deletion intent revokes new writes even before key destruction.
 * This orders key authorization, not application writes using bytes that a
 * caller already obtained before revocation.
 */
export async function getOrCreateSubjectKey(subjectId: string): Promise<SubjectKey> {
    const config = loadErasureConfig();
    const dek = generateDek();
    const record = await insertSubjectKeyIfAbsent({
        subjectId,
        kekId: config.currentKek.id,
        wrappedDek: wrapDek(config.currentKek.key, dek, subjectId, config.currentKek.id),
    });
    return unwrapRecord(record);
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
    return deleteSubjectKey(subjectId);
}

/** Confirm destruction by reading through to the store. */
export async function verifySubjectKeyDestroyed(subjectId: string): Promise<boolean> {
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
                rewrapped += 1;
                onProgress?.(rewrapped);
            }
        }
        after = batch[batch.length - 1].subjectId;
    }
    return rewrapped;
}

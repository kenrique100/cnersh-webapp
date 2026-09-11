/**
 * Field-level helpers that put the envelope encryption to work on the columns
 * that hold personal data under a user's own key.
 *
 * Registry of protected fields (keep docs/ACCOUNT_DELETION.md in sync):
 *
 *   File.data          inline file content (legacy base64 uploads)
 *   Project.formData   protocol wizard payload: investigator identities and
 *                      contact details, co-investigators, document references
 *
 * Plaintext values written before this feature shipped are still readable;
 * scripts/encrypt-existing-user-data.ts converts them. Reading a value whose
 * key has been destroyed raises ErasedDataError so callers can answer honestly
 * (410 Gone, "content erased") instead of failing with a generic 500.
 */

import { ErasureNotConfiguredError, isErasureConfigured } from "./config";
import { decryptField, encryptField, isEncryptedValue, parseEnvelope } from "./crypto";
import { getOrCreateSubjectKey, getSubjectKey } from "./keys";

export class ErasedDataError extends Error {
    constructor(public readonly subjectId: string) {
        super("This content was erased at the owner's request and can no longer be read");
        this.name = "ErasedDataError";
    }
}

let warnedPlaintext = false;

/**
 * Development convenience only: without ERASURE_KEK, non-production
 * environments keep writing plaintext (with a single warning) so local work is
 * not blocked. Production fails closed.
 */
function allowPlaintextFallback(): boolean {
    if (isErasureConfigured()) return false;
    if (process.env.NODE_ENV === "production") {
        throw new ErasureNotConfiguredError(
            "ERASURE_KEK must be configured in production before personal data can be written"
        );
    }
    if (!warnedPlaintext) {
        warnedPlaintext = true;
        console.warn(
            "[erasure] ERASURE_KEK is not set; personal data fields are being stored in plaintext. " +
                "This is only permitted outside production."
        );
    }
    return true;
}

export async function sealString(subjectId: string, model: string, field: string, plaintext: string): Promise<string> {
    if (allowPlaintextFallback()) return plaintext;
    const key = await getOrCreateSubjectKey(subjectId);
    return encryptField(key.dek, subjectId, key.keyVersion, model, field, plaintext);
}

/**
 * Decrypt a stored value. Plaintext (pre-migration) values pass through.
 * Throws ErasedDataError when the owning key no longer exists.
 */
export async function openString(model: string, field: string, value: string): Promise<string> {
    const envelope = parseEnvelope(value);
    if (!envelope) return value;
    const key = await getSubjectKey(envelope.subjectId);
    if (!key) throw new ErasedDataError(envelope.subjectId);
    return decryptField(key.dek, envelope, model, field);
}

/** Decrypt then encrypt for another subject (custody transfer of retained records). */
export async function rekeyString(model: string, field: string, value: string, newSubjectId: string): Promise<string> {
    const envelope = parseEnvelope(value);
    if (envelope && envelope.subjectId === newSubjectId) return value;
    const plaintext = await openString(model, field, value);
    return sealString(newSubjectId, model, field, plaintext);
}

// ── File.data ────────────────────────────────────────────────────────────────

export const sealFileData = (userId: string, base64: string) => sealString(userId, "File", "data", base64);
export const openFileData = (value: string) => openString("File", "data", value);

// ── Project.formData ─────────────────────────────────────────────────────────

const FORM_DATA_MARKER = "__enc";
/**
 * Written in place of a sealed payload whose key was destroyed before the row
 * could be re-keyed (typically a row resurrected by a database restore). The
 * data is unrecoverable by design; the marker lets the UI say so honestly.
 */
export const FORM_DATA_ERASED_MARKER = "__erased";

export interface ErasedFormData {
    [FORM_DATA_ERASED_MARKER]: true;
    erasedAt: string;
}

export function isErasedFormData(value: unknown): value is ErasedFormData {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>)[FORM_DATA_ERASED_MARKER] === true
    );
}

export function erasedFormDataMarker(erasedAt = new Date()): ErasedFormData {
    return { [FORM_DATA_ERASED_MARKER]: true, erasedAt: erasedAt.toISOString() };
}

export interface SealedFormData {
    [FORM_DATA_MARKER]: string;
}

export function isSealedFormData(value: unknown): value is SealedFormData {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        FORM_DATA_MARKER in value &&
        isEncryptedValue((value as Record<string, unknown>)[FORM_DATA_MARKER])
    );
}

export async function sealProjectFormData(
    userId: string,
    formData: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const sealed = await sealString(userId, "Project", "formData", JSON.stringify(formData));
    if (!isEncryptedValue(sealed)) return formData; // plaintext fallback outside production
    return { [FORM_DATA_MARKER]: sealed };
}

export interface OpenedFormData {
    data: Record<string, unknown> | null;
    /** True when the owner's key was destroyed and the payload is unreadable. */
    erased: boolean;
}

export async function openProjectFormData(value: unknown): Promise<OpenedFormData> {
    if (value === null || value === undefined) return { data: null, erased: false };
    if (isErasedFormData(value)) return { data: null, erased: true };
    if (!isSealedFormData(value)) {
        return { data: typeof value === "object" ? (value as Record<string, unknown>) : null, erased: false };
    }
    try {
        const json = await openString("Project", "formData", value[FORM_DATA_MARKER]);
        return { data: JSON.parse(json) as Record<string, unknown>, erased: false };
    } catch (error) {
        if (error instanceof ErasedDataError) return { data: null, erased: true };
        throw error;
    }
}

/**
 * Re-encrypts a payload for a new custodian. When the original key has already
 * been destroyed the payload cannot be recovered; an erased marker is returned
 * instead so the row stops carrying undecryptable ciphertext.
 */
export async function rekeyProjectFormData(value: unknown, newSubjectId: string): Promise<unknown> {
    if (isErasedFormData(value)) return value;
    if (!isSealedFormData(value)) {
        if (value === null || value === undefined || typeof value !== "object") return value;
        // Plaintext row from before the migration: seal it for the new custodian.
        return sealProjectFormData(newSubjectId, value as Record<string, unknown>);
    }
    try {
        return { [FORM_DATA_MARKER]: await rekeyString("Project", "formData", value[FORM_DATA_MARKER], newSubjectId) };
    } catch (error) {
        if (error instanceof ErasedDataError) return erasedFormDataMarker();
        throw error;
    }
}

/**
 * Envelope encryption primitives.
 *
 *   KEK (env / KMS)  --wraps-->  per-subject DEK  --encrypts-->  field values
 *
 * Every ciphertext is bound to the subject it belongs to and to the model and
 * field it was written for through AES-GCM additional authenticated data, so a
 * value copied between users, rows, or columns fails to decrypt instead of
 * silently leaking.
 *
 * Ciphertext wire format (a plain string, safe for text and JSON columns):
 *
 *   enc1:<subjectId>:<keyVersion>:<base64url(nonce || tag || ciphertext)>
 *
 * The subject id travels with the value so a reader can locate the right key
 * without knowing who originally wrote the row (for example after a retained
 * protocol has been re-keyed to the institutional subject).
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CIPHERTEXT_PREFIX = "enc1";
const ALGORITHM = "aes-256-gcm";
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
export const DEK_BYTES = 32;

export interface EncryptedEnvelope {
    subjectId: string;
    keyVersion: number;
    payload: Buffer;
}

export function generateDek(): Buffer {
    return randomBytes(DEK_BYTES);
}

function assertKey(key: Buffer, name: string): void {
    if (!Buffer.isBuffer(key) || key.length !== DEK_BYTES) {
        throw new Error(`${name} must be a 32-byte buffer`);
    }
}

function seal(key: Buffer, plaintext: Buffer, aad: string): Buffer {
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, nonce);
    cipher.setAAD(Buffer.from(aad, "utf8"));
    const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([nonce, cipher.getAuthTag(), body]);
}

function open(key: Buffer, payload: Buffer, aad: string): Buffer {
    if (payload.length < NONCE_BYTES + TAG_BYTES) {
        throw new Error("Ciphertext is truncated");
    }
    const nonce = payload.subarray(0, NONCE_BYTES);
    const tag = payload.subarray(NONCE_BYTES, NONCE_BYTES + TAG_BYTES);
    const body = payload.subarray(NONCE_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, key, nonce);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]);
}

/** Wrap a DEK under a KEK, binding it to the subject it protects. */
export function wrapDek(kek: Buffer, dek: Buffer, subjectId: string, kekId: string): Buffer {
    assertKey(kek, "KEK");
    assertKey(dek, "DEK");
    return seal(kek, dek, `wrap|${kekId}|${subjectId}`);
}

export function unwrapDek(kek: Buffer, wrapped: Buffer, subjectId: string, kekId: string): Buffer {
    assertKey(kek, "KEK");
    const dek = open(kek, wrapped, `wrap|${kekId}|${subjectId}`);
    assertKey(dek, "Unwrapped DEK");
    return dek;
}

export function fieldAad(subjectId: string, model: string, field: string): string {
    return `field|${model}.${field}|${subjectId}`;
}

/** Encrypt a UTF-8 string for a subject. Returns the `enc1:` wire format. */
export function encryptField(
    dek: Buffer,
    subjectId: string,
    keyVersion: number,
    model: string,
    field: string,
    plaintext: string
): string {
    assertKey(dek, "DEK");
    if (!subjectId || subjectId.includes(":")) {
        throw new Error("subjectId must be non-empty and must not contain ':'");
    }
    const payload = seal(dek, Buffer.from(plaintext, "utf8"), fieldAad(subjectId, model, field));
    return `${CIPHERTEXT_PREFIX}:${subjectId}:${keyVersion}:${payload.toString("base64url")}`;
}

export function parseEnvelope(value: string): EncryptedEnvelope | null {
    if (typeof value !== "string" || !value.startsWith(`${CIPHERTEXT_PREFIX}:`)) return null;
    const parts = value.split(":");
    if (parts.length !== 4) return null;
    const [, subjectId, version, payload] = parts;
    const keyVersion = Number.parseInt(version, 10);
    if (!subjectId || !Number.isInteger(keyVersion) || keyVersion < 1 || !payload) return null;
    return { subjectId, keyVersion, payload: Buffer.from(payload, "base64url") };
}

export function isEncryptedValue(value: unknown): value is string {
    return typeof value === "string" && parseEnvelope(value) !== null;
}

export function decryptField(dek: Buffer, envelope: EncryptedEnvelope, model: string, field: string): string {
    assertKey(dek, "DEK");
    return open(dek, envelope.payload, fieldAad(envelope.subjectId, model, field)).toString("utf8");
}

/** Deterministic pseudonym for the journal; never reversible without the key. */
export function hmacPseudonym(key: Buffer, value: string): string {
    return createHmac("sha256", key).update(value.trim().toLowerCase()).digest("hex");
}

export function constantTimeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

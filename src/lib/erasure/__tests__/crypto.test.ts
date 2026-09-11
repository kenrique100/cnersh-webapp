import { randomBytes } from "node:crypto";

import {
    CIPHERTEXT_PREFIX,
    constantTimeEqual,
    decryptField,
    encryptField,
    generateDek,
    hmacPseudonym,
    isEncryptedValue,
    parseEnvelope,
    unwrapDek,
    wrapDek,
} from "@/lib/erasure/crypto";

describe("erasure crypto primitives", () => {
    const dek = generateDek();

    it("round-trips a field value and binds it to subject, model and field", () => {
        const sealed = encryptField(dek, "user-1", 1, "Project", "formData", "hello");
        expect(sealed.startsWith(`${CIPHERTEXT_PREFIX}:user-1:1:`)).toBe(true);
        expect(isEncryptedValue(sealed)).toBe(true);

        const envelope = parseEnvelope(sealed);
        expect(envelope).not.toBeNull();
        expect(envelope?.subjectId).toBe("user-1");
        expect(envelope?.keyVersion).toBe(1);
        expect(decryptField(dek, envelope!, "Project", "formData")).toBe("hello");
    });

    it("refuses to decrypt under a different model or field (AAD mismatch)", () => {
        const sealed = encryptField(dek, "user-1", 1, "Project", "formData", "hello");
        const envelope = parseEnvelope(sealed)!;
        expect(() => decryptField(dek, envelope, "File", "data")).toThrow();
        expect(() => decryptField(dek, envelope, "Project", "other")).toThrow();
    });

    it("refuses to decrypt when the ciphertext is moved to another subject", () => {
        const sealed = encryptField(dek, "user-1", 1, "Project", "formData", "hello");
        const moved = sealed.replace(":user-1:", ":user-2:");
        expect(() => decryptField(dek, parseEnvelope(moved)!, "Project", "formData")).toThrow();
    });

    it("refuses to decrypt with the wrong key", () => {
        const sealed = encryptField(dek, "user-1", 1, "Project", "formData", "hello");
        expect(() => decryptField(generateDek(), parseEnvelope(sealed)!, "Project", "formData")).toThrow();
    });

    it("produces distinct ciphertexts for identical plaintexts (fresh nonce)", () => {
        const a = encryptField(dek, "user-1", 1, "Project", "formData", "same");
        const b = encryptField(dek, "user-1", 1, "Project", "formData", "same");
        expect(a).not.toBe(b);
    });

    it("parseEnvelope rejects plaintext and malformed values", () => {
        expect(parseEnvelope("just text")).toBeNull();
        expect(parseEnvelope("enc1:only:two")).toBeNull();
        expect(parseEnvelope("enc1:user:notanumber:abc")).toBeNull();
        expect(isEncryptedValue(42)).toBe(false);
        expect(isEncryptedValue(null)).toBe(false);
    });

    it("wraps and unwraps a DEK bound to subject and KEK id", () => {
        const kek = randomBytes(32);
        const wrapped = wrapDek(kek, dek, "user-1", "kek-1");
        expect(unwrapDek(kek, wrapped, "user-1", "kek-1").equals(dek)).toBe(true);
        expect(() => unwrapDek(kek, wrapped, "user-2", "kek-1")).toThrow();
        expect(() => unwrapDek(kek, wrapped, "user-1", "kek-2")).toThrow();
        expect(() => unwrapDek(randomBytes(32), wrapped, "user-1", "kek-1")).toThrow();
    });

    it("derives a stable, case-insensitive email pseudonym", () => {
        const key = randomBytes(32);
        expect(hmacPseudonym(key, "A@Example.com")).toBe(hmacPseudonym(key, "a@example.com"));
        expect(hmacPseudonym(key, "a@example.com")).not.toBe(hmacPseudonym(randomBytes(32), "a@example.com"));
    });

    it("compares strings in constant time", () => {
        expect(constantTimeEqual("abc", "abc")).toBe(true);
        expect(constantTimeEqual("abc", "abd")).toBe(false);
        expect(constantTimeEqual("abc", "abcd")).toBe(false);
    });
});

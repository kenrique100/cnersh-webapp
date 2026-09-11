import { randomBytes } from "node:crypto";

import {
    DEFAULT_KEK_ID,
    ErasureNotConfiguredError,
    getErasureCapabilities,
    isErasureConfigured,
    loadErasureConfig,
} from "@/lib/erasure/config";

const KEK = randomBytes(32).toString("base64");
const OLD = randomBytes(32).toString("base64");

describe("erasure configuration", () => {
    it("reports not configured without ERASURE_KEK and fails closed", () => {
        const env = { DATABASE_URL: "postgresql://x/app" } as unknown as NodeJS.ProcessEnv;
        expect(isErasureConfigured(env)).toBe(false);
        expect(() => loadErasureConfig(env)).toThrow(ErasureNotConfiguredError);
        expect(getErasureCapabilities(env)).toEqual({ configured: false, storeIsolated: false, kekId: null });
    });

    it("rejects a KEK that is not 32 bytes", () => {
        const env = { ERASURE_KEK: Buffer.from("short").toString("base64"), DATABASE_URL: "postgresql://x/app" } as unknown as NodeJS.ProcessEnv;
        expect(() => loadErasureConfig(env)).toThrow(/32-byte key/);
    });

    it("detects whether the key store is isolated from the application database", () => {
        const shared = loadErasureConfig({ ERASURE_KEK: KEK, DATABASE_URL: "postgresql://u:p@h/app?sslmode=require" } as unknown as NodeJS.ProcessEnv);
        expect(shared.storeIsolated).toBe(false);
        expect(shared.currentKek.id).toBe(DEFAULT_KEK_ID);

        const isolated = loadErasureConfig({
            ERASURE_KEK: KEK,
            ERASURE_KEK_ID: "kek-7",
            DATABASE_URL: "postgresql://u:p@h/app",
            ERASURE_STORE_URL: "postgresql://u:p@h/erasure",
        } as unknown as NodeJS.ProcessEnv);
        expect(isolated.storeIsolated).toBe(true);
        expect(getErasureCapabilities({ ...process.env, ERASURE_KEK: KEK, ERASURE_KEK_ID: "kek-7", DATABASE_URL: "postgresql://u:p@h/app", ERASURE_STORE_URL: "postgresql://u:p@h/erasure" } as unknown as NodeJS.ProcessEnv))
            .toEqual({ configured: true, storeIsolated: true, kekId: "kek-7" });
    });

    it("parses previous KEKs for rotation and ignores the current id", () => {
        const config = loadErasureConfig({
            ERASURE_KEK: KEK,
            ERASURE_KEK_ID: "kek-2",
            ERASURE_KEK_PREVIOUS: `kek-1:${OLD}, kek-2:${KEK}`,
            DATABASE_URL: "postgresql://u:p@h/app",
        } as unknown as NodeJS.ProcessEnv);
        expect(config.previousKeks.map((k) => k.id)).toEqual(["kek-1"]);
        expect(() =>
            loadErasureConfig({ ERASURE_KEK: KEK, ERASURE_KEK_PREVIOUS: "nocolon", DATABASE_URL: "postgresql://u:p@h/app" } as unknown as NodeJS.ProcessEnv)
        ).toThrow(/kek-id:base64key/);
    });
});

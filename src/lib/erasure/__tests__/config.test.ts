import { randomBytes } from "node:crypto";

import {
    DEFAULT_KEK_ID,
    ErasureNotConfiguredError,
    getErasureCapabilities,
    isErasureConfigured,
    isSameDatabaseDestination,
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
        expect(getErasureCapabilities({ ERASURE_KEK: KEK, ERASURE_KEK_ID: "kek-7", DATABASE_URL: "postgresql://u:p@h/app", ERASURE_STORE_URL: "postgresql://u:p@h/erasure" } as unknown as NodeJS.ProcessEnv))
            .toEqual({ configured: true, storeIsolated: true, kekId: "kek-7" });
    });

    it.each([
        ["different credentials", "postgresql://another:secret@h/app"],
        ["different query parameters", "postgresql://u:p@h/app?sslmode=require&connect_timeout=10"],
        ["protocol alias and default port", "postgres://u:p@h:5432/app"],
        ["host casing and trailing dot", "postgresql://u:p@H./app"],
        ["encoded database name", "postgresql://u:p@h/%61pp"],
        ["a URL fragment", "postgresql://u:p@h/app#another-database"],
    ])("does not infer isolation from %s", (_label, storeUrl) => {
        const config = loadErasureConfig({
            ERASURE_KEK: KEK,
            DATABASE_URL: "postgresql://u:p@h/app",
            ERASURE_STORE_URL: storeUrl,
        } as unknown as NodeJS.ProcessEnv);
        expect(config.storeIsolated).toBe(false);
        expect(config.storeUrl).toBe(storeUrl);
    });

    it.each([
        ["same database, pooled versus direct", "ep-damp-shadow-am2nf7s2", "cnersh_staging"],
        ["different database, same pooled endpoint", "ep-damp-shadow-am2nf7s2-pooler", "cnersh_erasure_staging"],
        ["different database, direct endpoint", "ep-damp-shadow-am2nf7s2", "cnersh_erasure_staging"],
    ])("does not claim Neon backup isolation for %s", (_label, endpoint, database) => {
        const env = {
            ERASURE_KEK: KEK,
            DATABASE_URL: "postgresql://app:password@ep-damp-shadow-am2nf7s2-pooler.us-east-2.aws.neon.tech/cnersh_staging?sslmode=require",
            ERASURE_STORE_URL: `postgresql://keys:other@${endpoint}.us-east-2.aws.neon.tech/${database}?sslmode=require&channel_binding=require`,
        } as unknown as NodeJS.ProcessEnv;
        expect(loadErasureConfig(env).storeIsolated).toBe(false);
        expect(getErasureCapabilities(env)).toEqual({ configured: true, storeIsolated: false, kekId: DEFAULT_KEK_ID });
    });

    it("treats distinct Neon endpoints as a logical separation hint, not proof of independent project/history", () => {
        const env = {
            ERASURE_KEK: KEK,
            DATABASE_URL: "postgresql://app:password@ep-damp-shadow-am2nf7s2-pooler.us-east-2.aws.neon.tech/cnersh_staging?sslmode=require",
            DIRECT_URL: "postgresql://admin:other@ep-damp-shadow-am2nf7s2.us-east-2.aws.neon.tech/cnersh_staging?sslmode=require",
            ERASURE_STORE_URL: "postgresql://keys:password@ep-other-endpoint-pooler.us-east-2.aws.neon.tech/cnersh_erasure_staging?sslmode=require",
        } as unknown as NodeJS.ProcessEnv;
        expect(loadErasureConfig(env).storeIsolated).toBe(true);
        expect(getErasureCapabilities(env)).toEqual({ configured: true, storeIsolated: true, kekId: DEFAULT_KEK_ID });
    });

    it.each(["DIRECT_URL", "DATABASE_URL"])("checks the store against %s as well as the other app URL", (matchingUrl) => {
        expect(loadErasureConfig({
            ERASURE_KEK: KEK,
            DIRECT_URL: "postgresql://u:p@other-host/other",
            DATABASE_URL: "postgresql://u:p@other-host/other",
            [matchingUrl]: "postgresql://app:password@h/app",
            ERASURE_STORE_URL: "postgresql://keys:other@h/app?sslmode=require",
        } as unknown as NodeJS.ProcessEnv).storeIsolated).toBe(false);
    });

    it.each([
        ["a different local database", "postgresql://keys:other@localhost/erasure"],
        ["a different generic host", "postgresql://keys:other@separate-host/app"],
    ])("retains logical isolation as a heuristic for %s", (_label, storeUrl) => {
        expect(loadErasureConfig({
            ERASURE_KEK: KEK,
            DATABASE_URL: "postgresql://app:password@localhost/app",
            ERASURE_STORE_URL: storeUrl,
        } as unknown as NodeJS.ProcessEnv).storeIsolated).toBe(true);
    });

    it.each([undefined, "", "   "])("does not claim isolation without an app destination (%s)", (appUrl) => {
        const env = {
            ERASURE_KEK: KEK,
            DIRECT_URL: appUrl,
            DATABASE_URL: appUrl,
            ERASURE_STORE_URL: "postgresql://keys:other@h/erasure",
        } as unknown as NodeJS.ProcessEnv;
        expect(loadErasureConfig(env).storeIsolated).toBe(false);
        expect(getErasureCapabilities(env).storeIsolated).toBe(false);
    });

    it.each([
        "not-a-url",
        "https://h/app",
        "postgresql://u:p@h",
        "postgresql://different-user:p@h/",
        "postgresql://u:p@h/%ZZ",
        "postgresql://u:p@h/app/extra",
        "postgresql://u:p@h/%00",
        "postgresql://u:p@h/app?host=other-host",
        "postgresql://u:p@h/app?dbname=erasure",
    ])("fails closed for an unidentifiable app or store destination: %s", (url) => {
        const env = {
            ERASURE_KEK: KEK,
            DATABASE_URL: "postgresql://app:password@localhost/app",
            ERASURE_STORE_URL: "postgresql://keys:other@localhost/erasure",
        } as unknown as NodeJS.ProcessEnv;
        expect(loadErasureConfig({ ...env, DATABASE_URL: url }).storeIsolated).toBe(false);
        expect(loadErasureConfig({ ...env, ERASURE_STORE_URL: url }).storeIsolated).toBe(false);
        expect(loadErasureConfig({ ...env, DIRECT_URL: url }).storeIsolated).toBe(false);
    });

    it("ignores a blank DIRECT_URL when choosing the application fallback", () => {
        const config = loadErasureConfig({
            ERASURE_KEK: KEK,
            DIRECT_URL: "   ",
            DATABASE_URL: "  postgresql://u:p@h/app  ",
        } as unknown as NodeJS.ProcessEnv);
        expect(config.storeUrl).toBe("postgresql://u:p@h/app");
        expect(config.storeIsolated).toBe(false);
    });

    it("requires at least one store or application URL", () => {
        expect(() => loadErasureConfig({ ERASURE_KEK: KEK } as unknown as NodeJS.ProcessEnv))
            .toThrow(/ERASURE_STORE_URL or DATABASE_URL/);
    });

    it("recognizes direct and pooled connections to the same Neon database", () => {
        expect(isSameDatabaseDestination(
            "postgresql://app:one@ep-damp-shadow-am2nf7s2-pooler.us-east-2.aws.neon.tech/cnersh_staging?sslmode=require",
            "postgres://admin:two@ep-damp-shadow-am2nf7s2.us-east-2.aws.neon.tech:5432/cnersh_%73taging",
        )).toBe(true);
    });

    it.each([
        ["postgresql://u:p@h/app", "postgresql://other:password@h:5432/app", true],
        ["postgresql://u:p@h/app", "postgresql://u:p@h/erasure", false],
        ["postgresql://u:p@h/app", "postgresql://u:p@other/app", false],
        ["postgresql://u:p@h/app", "postgresql://u:p@h:6432/app", false],
        ["postgresql://u:p@h/app", "postgresql://u:p@h/app?dbname=other", false],
        ["invalid", "invalid", false],
        ["postgresql://u:p@h", "postgresql://u:p@h", false],
    ])("compares database destinations without treating unknowns as matches", (first, second, same) => {
        expect(isSameDatabaseDestination(first, second)).toBe(same);
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

/** @jest-environment node */

// Import the CLI only behind mocks: no dotenv loading, real clients,
// subprocesses, file mutations, process exit or external database access.
jest.mock("dotenv/config", () => ({}));
jest.mock("node:child_process", () => ({ execFile: jest.fn() }));
jest.mock("node:fs/promises", () => ({ mkdtemp: jest.fn(), rm: jest.fn() }));
jest.mock("@prisma/adapter-pg", () => ({ PrismaPg: jest.fn() }));
jest.mock("@/generated/prisma/client", () => ({ PrismaClient: jest.fn() }));
jest.mock("@/lib/erasure/config", () => ({
    ...jest.requireActual("@/lib/erasure/config"),
    loadErasureConfig: jest.fn(),
}));
jest.mock("@/lib/erasure/deletion-service", () => ({
    __setDbForTests: jest.fn(),
    reconcileWithJournal: jest.fn(),
    requestAccountDeletion: jest.fn(),
}));
jest.mock("@/lib/erasure/fields", () => ({
    ErasedDataError: class extends Error {},
    openFileData: jest.fn(),
    openProjectFormData: jest.fn(),
    sealFileData: jest.fn(),
    sealProjectFormData: jest.fn(),
}));
jest.mock("@/lib/erasure/keys", () => ({
    forgetSubjectKey: jest.fn(),
    getOrCreateSubjectKey: jest.fn(),
    getSubjectKey: jest.fn(),
}));
jest.mock("@/lib/erasure/retention-policy", () => ({ isTombstoneEmail: jest.fn() }));
jest.mock("@/lib/erasure/store", () => ({
    deleteJournalEntryForFixture: jest.fn(),
    deleteSubjectKey: jest.fn(),
    readJournalEntry: jest.fn(),
}));
jest.mock("../../../../scripts/erasure-lib", () => ({
    connectionString: jest.fn(() => process.env.DIRECT_URL || process.env.DATABASE_URL),
    hasFlag: jest.fn((flag: string) => process.argv.includes(flag)),
    run: jest.fn(),
}));

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";

import { PrismaClient } from "@/generated/prisma/client";
import { loadErasureConfig } from "@/lib/erasure/config";
import { reconcileWithJournal, requestAccountDeletion } from "@/lib/erasure/deletion-service";
import { openProjectFormData } from "@/lib/erasure/fields";
import { getSubjectKey } from "@/lib/erasure/keys";
import { isTombstoneEmail } from "@/lib/erasure/retention-policy";
import { readJournalEntry } from "@/lib/erasure/store";

import { run } from "../../../../scripts/erasure-lib";
import { restoreDatabase, validateDrillTarget } from "../../../../scripts/erasure-restore-drill";

const TARGET = "postgresql://fixture:dummy@localhost/cnersh_drill?sslmode=disable";
const ARGS = ["--confirm-restore", "--confirm-database=cnersh_drill"];
const ENV = { NODE_ENV: "test", DATABASE_URL: TARGET } as NodeJS.ProcessEnv;
// Capture before clearAllMocks removes the registration.
const main = jest.mocked(run).mock.calls[0][0];

describe("restore drill safety", () => {
    const originalEnv = process.env;
    const originalArgv = process.argv;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...ENV, DATABASE_URL: TARGET };
        process.argv = ["node", "erasure-restore-drill.ts", ...ARGS];
    });

    afterEach(() => {
        process.env = originalEnv;
        process.argv = originalArgv;
        jest.restoreAllMocks();
    });

    it("requires a database confirmation even when the npm alias supplies --confirm-restore", () => {
        expect(() => validateDrillTarget(TARGET, ENV, ["--confirm-restore"]))
            .toThrow(/--confirm-database=cnersh_drill/);
    });

    it.each([
        ["--confirm-database=cnersh_drill"],
        ["--confirm-restore", "--confirm-database=another_drill"],
        ["--confirm-restore", "--confirm-database=CNERSH_DRILL"],
        ["--confirm-restore", "--confirm-database="],
        ["--confirm-restore", "--confirm-database", "cnersh_drill"],
        [...ARGS, "--confirm-database=cnersh_drill"],
        [...ARGS, "--confirm-database=another_drill"],
    ])("rejects absent, mismatched or ambiguous confirmation: %j", (...args) => {
        expect(() => validateDrillTarget(TARGET, ENV, args)).toThrow();
    });

    it("accepts an explicitly confirmed disposable target without executing anything", () => {
        expect(validateDrillTarget(TARGET, ENV, ARGS)).toBe("cnersh_drill");
        expect(execFile).not.toHaveBeenCalled();
        expect(PrismaClient).not.toHaveBeenCalled();
        expect(mkdtemp).not.toHaveBeenCalled();
    });

    it("compares the decoded database name, not URL encoding", () => {
        expect(validateDrillTarget(TARGET.replace("cnersh_drill", "cnersh_%64rill"), ENV, ARGS))
            .toBe("cnersh_drill");
    });

    it.each(["production", " PRODUCTION "])("refuses NODE_ENV=%s despite both confirmations", (nodeEnv) => {
        expect(() => validateDrillTarget(TARGET, { NODE_ENV: nodeEnv } as NodeJS.ProcessEnv, ARGS))
            .toThrow(/NODE_ENV=production/);
    });

    it("refuses a production-named database despite a matching confirmation", () => {
        expect(() => validateDrillTarget(
            TARGET.replace("cnersh_drill", "production"),
            ENV,
            ["--confirm-restore", "--confirm-database=production"],
        )).toThrow(/name must contain/);
    });

    it.each([
        "not-a-url",
        "https://localhost/cnersh_drill",
        "postgresql://fixture:dummy@localhost",
        "postgresql://fixture:dummy@localhost/cnersh_%ZZ_drill",
        "postgresql://fixture:dummy@localhost/cnersh_drill/production",
        "postgresql://fixture:dummy@localhost/cnersh_drill%00",
        `${TARGET}&dbname=production`,
        `${TARGET}&database=production`,
        `${TARGET}&host=production`,
        `${TARGET}&hostaddr=192.0.2.1`,
        `${TARGET}&port=6432`,
        `${TARGET}&service=production`,
        `${TARGET}&servicefile=production`,
    ])("refuses an invalid or ambiguous destination: %s", (url) => {
        expect(() => validateDrillTarget(url, ENV, ARGS)).toThrow(/Refusing/);
    });

    it("does not reveal credentials when an invalid target is rejected", () => {
        expect(() => validateDrillTarget("postgresql://fixture:dummy@[invalid/cnersh_drill", ENV, ARGS))
            .toThrow("Refusing to run against an invalid PostgreSQL destination");
    });

    it("validates the effective DIRECT_URL rather than confirmation of DATABASE_URL", async () => {
        process.env.DIRECT_URL = TARGET.replace("cnersh_drill", "other_staging");
        await expect(main()).rejects.toThrow(/--confirm-database=other_staging/);
        expect(loadErasureConfig).not.toHaveBeenCalled();
        expect(PrismaClient).not.toHaveBeenCalled();
        expect(mkdtemp).not.toHaveBeenCalled();
        expect(execFile).not.toHaveBeenCalled();
        expect(requestAccountDeletion).not.toHaveBeenCalled();
    });

    it("fails preflight before creating fixtures when only the implicit npm flag is supplied", async () => {
        process.argv = ["node", "erasure-restore-drill.ts", "--confirm-restore"];
        await expect(main()).rejects.toThrow(/--confirm-database=cnersh_drill/);
        expect(loadErasureConfig).not.toHaveBeenCalled();
        expect(PrismaClient).not.toHaveBeenCalled();
        expect(mkdtemp).not.toHaveBeenCalled();
        expect(execFile).not.toHaveBeenCalled();
    });

    it("requires DATABASE_URL even when DIRECT_URL is set and explicitly confirmed", async () => {
        delete process.env.DATABASE_URL;
        process.env.DIRECT_URL = TARGET;
        await expect(main()).rejects.toThrow(/Set DATABASE_URL/);
        expect(loadErasureConfig).not.toHaveBeenCalled();
        expect(PrismaClient).not.toHaveBeenCalled();
        expect(mkdtemp).not.toHaveBeenCalled();
        expect(execFile).not.toHaveBeenCalled();
    });

    it.each([
        TARGET.replace("localhost", "another-host"),
        TARGET.replace("localhost", "localhost:6432"),
        TARGET.replace("cnersh_drill", "other_staging"),
        `${TARGET}&dbname=production`,
        "not-a-url",
    ])("refuses a different or ambiguous application database even when DIRECT_URL is confirmed: %s", async (appUrl) => {
        process.env.DIRECT_URL = TARGET;
        process.env.DATABASE_URL = appUrl;
        await expect(main()).rejects.toThrow(/DATABASE_URL and DIRECT_URL must identify the same database/);
        expect(loadErasureConfig).not.toHaveBeenCalled();
        expect(PrismaClient).not.toHaveBeenCalled();
        expect(mkdtemp).not.toHaveBeenCalled();
        expect(execFile).not.toHaveBeenCalled();
    });

    it("permits matching Neon pooled/direct app URLs with different credentials", () => {
        const pooled = "postgresql://app:one@ep-damp-shadow-am2nf7s2-pooler.us-east-2.aws.neon.tech/cnersh_staging?sslmode=require";
        const direct = "postgres://admin:two@ep-damp-shadow-am2nf7s2.us-east-2.aws.neon.tech:5432/cnersh_staging";
        expect(validateDrillTarget(
            direct,
            { ...ENV, DATABASE_URL: pooled, DIRECT_URL: direct },
            ["--confirm-restore", "--confirm-database=cnersh_staging"],
        )).toBe("cnersh_staging");
        expect(execFile).not.toHaveBeenCalled();
    });

    it("does not treat different databases in one Neon branch as the same restore target", () => {
        const pooled = "postgresql://app:one@ep-damp-shadow-am2nf7s2-pooler.us-east-2.aws.neon.tech/cnersh_staging";
        const direct = "postgresql://admin:two@ep-damp-shadow-am2nf7s2.us-east-2.aws.neon.tech/other_staging";
        expect(() => validateDrillTarget(
            direct,
            { ...ENV, DATABASE_URL: pooled, DIRECT_URL: direct },
            ["--confirm-restore", "--confirm-database=other_staging"],
        )).toThrow(/DATABASE_URL and DIRECT_URL must identify the same database/);
    });

    it("retains the shared-store fallback warning without claiming production isolation", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        jest.mocked(loadErasureConfig).mockReturnValue({ storeIsolated: false } as ReturnType<typeof loadErasureConfig>);
        const stop = new Error("test stops before creating fixtures");
        jest.mocked(mkdtemp).mockRejectedValueOnce(stop);
        // A non-isolated store is still allowed through preflight for the
        // existing reconciliation-only fallback, but no database is touched.
        await expect(main()).rejects.toBe(stop);
        expect(warn.mock.calls.flat().join("\n"))
            .toMatch(/Independent erasure-store restore history is not established/);
        expect(warn.mock.calls.flat().join("\n"))
            .toMatch(/This logical drill cannot establish production backup isolation/);
        expect(warn.mock.calls.flat().join("\n")).not.toMatch(/points at the application database/);
        expect(PrismaClient).not.toHaveBeenCalled();
        expect(execFile).not.toHaveBeenCalled();
    });

    function mockSubprocess(error: Error | null): void {
        jest.mocked(execFile).mockImplementation((...args: unknown[]) => {
            const callback = args[args.length - 1] as (error: Error | null, stdout: string, stderr: string) => void;
            callback(error, "", "");
            return {} as ReturnType<typeof execFile>;
        });
    }

    it("uses pg_restore --exit-on-error while retaining safe cleanup options", async () => {
        mockSubprocess(null);
        await expect(restoreDatabase(TARGET, "/mock/before-deletion.dump")).resolves.toBeUndefined();
        expect(execFile).toHaveBeenCalledWith("pg_restore", [
            "--clean", "--if-exists", "--exit-on-error", "--no-owner", "--no-privileges",
            "--dbname", TARGET, "/mock/before-deletion.dump",
        ], expect.any(Function));
    });

    it.each([
        "pg_restore: error: permission denied\npg_restore: warning: errors ignored on restore: 1",
        "WARNING: a preceding notice\npg_restore: error: relation could not be created",
        "pg_restore: error: connection failed",
        "",
    ])("propagates every nonzero restore exit, including warnings: %s", async (stderr) => {
        const error = Object.assign(new Error("restore subprocess failed"), { code: 1, stderr });
        mockSubprocess(error);
        await expect(restoreDatabase(TARGET, "/mock/before-deletion.dump")).rejects.toBe(error);
    });

    it("reports failure, not restored/passed or reconciliation, after pg_restore rejects", async () => {
        // Reach the restore using synthetic mocked records only. --keep avoids
        // fixture cleanup so the assertions can detect any post-restore work.
        process.argv.push("--keep");
        const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
        const errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
        jest.mocked(loadErasureConfig).mockReturnValue({ storeIsolated: true } as ReturnType<typeof loadErasureConfig>);
        jest.mocked(mkdtemp).mockResolvedValue("/mock/drill");
        jest.mocked(rm).mockResolvedValue(undefined);
        const db = {
            user: {
                create: jest.fn().mockResolvedValue({}),
                findUniqueOrThrow: jest.fn().mockResolvedValue({ erasedAt: new Date(), email: "erased@drill.invalid" }),
            },
            account: { create: jest.fn().mockResolvedValue({}) },
            session: { create: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(0) },
            project: {
                create: jest.fn().mockResolvedValue({ id: "fixture-project" }),
                findUniqueOrThrow: jest.fn().mockResolvedValue({ formData: {} }),
                count: jest.fn().mockResolvedValue(0),
            },
            post: { create: jest.fn().mockResolvedValue({}) },
            file: { create: jest.fn().mockResolvedValue({ id: "fixture-file" }), count: jest.fn().mockResolvedValue(0) },
            $disconnect: jest.fn().mockResolvedValue(undefined),
        };
        jest.mocked(PrismaClient).mockReturnValue(db as unknown as PrismaClient);
        jest.mocked(openProjectFormData).mockResolvedValue({ data: { secret: "pi-A" }, erased: false });
        jest.mocked(requestAccountDeletion).mockResolvedValue({ status: "COMPLETED" } as Awaited<ReturnType<typeof requestAccountDeletion>>);
        jest.mocked(isTombstoneEmail).mockReturnValue(true);
        jest.mocked(getSubjectKey).mockResolvedValue(null);
        const error = Object.assign(new Error("restore subprocess failed"), {
            code: 1,
            stderr: "pg_restore: error: permission denied\npg_restore: warning: errors ignored on restore: 1",
        });
        jest.mocked(execFile).mockImplementation((...args: unknown[]) => {
            const callback = args[args.length - 1] as (error: Error | null, stdout: string, stderr: string) => void;
            callback(args[0] === "pg_restore" ? error : null, "", "");
            return {} as ReturnType<typeof execFile>;
        });

        await expect(main()).resolves.toBe(1);
        expect(execFile).toHaveBeenCalledWith("pg_restore", expect.arrayContaining(["--exit-on-error"]), expect.any(Function));
        expect(errorLog).toHaveBeenCalledWith("restore subprocess failed");
        expect(log.mock.calls.flat().join("\n")).not.toMatch(/database restored|DRILL PASSED|Checking the resurrected state/);
        expect(PrismaClient).toHaveBeenCalledTimes(1);
        expect(readJournalEntry).not.toHaveBeenCalled();
        expect(reconcileWithJournal).not.toHaveBeenCalled();
    });
});

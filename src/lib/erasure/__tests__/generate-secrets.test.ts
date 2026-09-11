/** @jest-environment node */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

describe("local erasure secret generation", () => {
    const script = resolve("scripts/generate-erasure-secrets.ts");
    const tsx = resolve("node_modules/tsx/dist/cli.mjs");
    let directory: string;
    beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "cnersh-secrets-test-")); });
    afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

    it("writes independent 32-byte secrets privately without printing or overwriting them", () => {
        const args = [tsx, script, "--environment=staging"];
        const stdout = execFileSync(process.execPath, args, { cwd: directory, encoding: "utf8" });
        const file = join(directory, ".env.staging.erasure.local");
        const contents = readFileSync(file, "utf8");
        const secrets = [...contents.matchAll(/^(?:ERASURE_KEK|ERASURE_HMAC_KEY|CRON_SECRET)="([^"]+)"/gm)]
            .map((match) => match[1]);
        expect(secrets).toHaveLength(3);
        expect(new Set(secrets).size).toBe(3);
        for (const secret of secrets) {
            expect(Buffer.from(secret, "base64")).toHaveLength(32);
            expect(stdout).not.toContain(secret);
        }
        expect(contents).toContain('ERASURE_KEK_ID="staging-kek-1"');
        expect(contents).toContain('ERASURE_KEK_PREVIOUS=""');
        if (process.platform !== "win32") expect(statSync(file).mode & 0o777).toBe(0o600);
        const repeat = spawnSync(process.execPath, args, { cwd: directory, encoding: "utf8" });
        expect(repeat.status).toBe(1);
        expect(repeat.stderr).toMatch(/Refusing to overwrite/);
        expect(readFileSync(file, "utf8")).toBe(contents);
    });

    it("requires an explicit supported environment", () => {
        const result = spawnSync(process.execPath, [tsx, script], { cwd: directory, encoding: "utf8" });
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/Usage:/);
    });
});

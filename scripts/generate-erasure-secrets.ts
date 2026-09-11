/**
 * Generate a NEW environment's secrets locally, never during deployment.
 * This is not key rotation. Existing output is never overwritten.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const environment = args[0]?.replace(/^--environment=/, "");
if (args.length !== 1 || !args[0].startsWith("--environment=") ||
    (environment !== "production" && environment !== "staging")) {
    console.error("Usage: npm run erasure:generate-keys -- --environment=production|staging");
    process.exit(1);
}

const filename = `.env.${environment}.erasure.local`;
const output = resolve(process.cwd(), filename);
const id = environment === "production" ? "prod-kek-1" : "staging-kek-1";
const contents = [
    "# Secret material. Never commit, upload to a PR, or paste into chat.",
    "# Save in your secret manager. Do not regenerate for each deployment.",
    `ERASURE_KEK="${randomBytes(32).toString("base64")}"`,
    `ERASURE_KEK_ID="${id}"`,
    `ERASURE_HMAC_KEY="${randomBytes(32).toString("base64")}"`,
    'ERASURE_KEK_PREVIOUS=""',
    `CRON_SECRET="${randomBytes(32).toString("base64")}"`,
    "",
].join("\n");

try {
    writeFileSync(output, contents, { flag: "wx", mode: 0o600 });
    console.log(`Created ${filename} with owner-only permissions on POSIX systems.`);
    console.log("Values were not printed. Import them into your secret manager and the matching host environment.");
    console.log("This file is not automatically loaded by Next.js or the operator scripts; configure them explicitly.");
} catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        console.error(`Refusing to overwrite ${filename}. Reuse the saved secrets, or follow the documented KEK rotation procedure.`);
    } else {
        console.error("Could not create the secrets file. Check local filesystem permissions.");
    }
    process.exitCode = 1;
}

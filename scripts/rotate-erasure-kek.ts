/**
 * Re-wrap every per-subject key under the current ERASURE_KEK.
 *
 *   1. Generate a new 32-byte key: openssl rand -base64 32
 *   2. Set ERASURE_KEK to the new value and ERASURE_KEK_ID to a new id,
 *      and add the old pair to ERASURE_KEK_PREVIOUS as "<old-id>:<old-base64>".
 *   3. Run: npm run erasure:rotate-kek
 *   4. Once every key reports the new kekId, remove the old pair from
 *      ERASURE_KEK_PREVIOUS.
 *
 * Subject keys (DEKs) never change, so field ciphertext does not need to be
 * rewritten and destroyed keys stay destroyed.
 */
// Load .env before anything imports the database client (import order matters).
import "dotenv/config";

import { loadErasureConfig } from "@/lib/erasure/config";
import { rewrapAllSubjectKeys } from "@/lib/erasure/keys";

import { run } from "./erasure-lib";

run(async () => {
    const config = loadErasureConfig();
    console.log(`Re-wrapping subject keys under ${config.currentKek.id} ...`);
    const count = await rewrapAllSubjectKeys((done) => {
        if (done % 500 === 0) console.log(`  ${done} keys re-wrapped`);
    });
    console.log(`Done. ${count} key(s) re-wrapped; all subject keys are now under ${config.currentKek.id}.`);
    return 0;
});

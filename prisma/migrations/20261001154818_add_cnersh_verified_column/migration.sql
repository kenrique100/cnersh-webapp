-- New column: tracks whether the account completed the CNERSH email verification.
ALTER TABLE "user" ADD COLUMN "cnershVerified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any account that already verified its email via the old flow is
-- treated as CNERSH-verified. Google accounts that were never gated will also
-- be marked verified here; if you would rather force them to re-verify, drop
-- the WHERE clause to leave them at false.
UPDATE "user" SET "cnershVerified" = true WHERE "emailVerified" = true;

CREATE INDEX "user_cnershVerified_idx" ON "user"("cnershVerified");
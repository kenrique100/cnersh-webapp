import { defineConfig } from "prisma/config";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Prisma v7 Configuration
 *
 * In Prisma v7, connection URLs are no longer defined in schema.prisma.
 * - `datasource.adapter` — used by Prisma Client at RUNTIME (app queries)
 * - `migrations.datasource.adapter` — used by Prisma Migrate (DDL / migrations)
 *
 * We use two separate connections:
 *   DATABASE_URL  → Neon pgBouncer pooler  (runtime queries, serverless-safe)
 *   DIRECT_URL    → Neon direct connection  (migrations, no pgBouncer)
 */

// Runtime pool — pgBouncer pooler URL, used by Prisma Client in the app
const runtimePool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

// Migration pool — direct (non-pooled) URL, required for DDL statements
const migrationPool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

export default defineConfig({
  schema: "./prisma/schema.prisma",

  // ─── Prisma Client (runtime) adapter ──────────────────────────────────
  // This adapter is passed to `new PrismaClient({ adapter })` automatically.
  datasource: {
    adapter: new PrismaPg(runtimePool),
  },

  // ─── Migrations ──────────────────────────────────────────────────
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",

    // Direct connection adapter for migrations (pgBouncer can’t run DDL)
    datasource: {
      adapter: new PrismaPg(migrationPool),
    },
  },
});

// prisma.config.ts
import { defineConfig } from "prisma/config"
import "dotenv/config"
import { sanitizeDatabaseUrl } from "./src/lib/sanitize-db-url"

// Prisma CLI (migrations, db push) must use a direct (non-pooled) connection.
// Connection poolers (Neon's -pooler endpoint, Supabase's PgBouncer) may not
// support the prepared statements or DDL that migrations require.
// Use DIRECT_URL first, falling back to DATABASE_URL if not set.
const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "./prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    // sanitizeDatabaseUrl encodes special characters in the password
    url: sanitizeDatabaseUrl(rawUrl),
  },
})
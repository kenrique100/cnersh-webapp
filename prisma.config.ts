// prisma.config.ts
import { defineConfig } from "prisma/config"
import "dotenv/config"
import { sanitizeDatabaseUrl } from "./src/lib/sanitize-db-url"

// Prisma CLI (migrations, db push) must use a direct or session-mode connection.
// PgBouncer in transaction mode (port 6543) does NOT support prepared statements
// which Prisma migrations require. Use DIRECT_URL (session mode, port 5432) first,
// falling back to DATABASE_URL only if DIRECT_URL is not set.
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
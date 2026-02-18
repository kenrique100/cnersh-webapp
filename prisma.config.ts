// prisma.config.ts
import { defineConfig } from "prisma/config"
import "dotenv/config"
import { sanitizeDatabaseUrl } from "./src/lib/sanitize-db-url"

const rawUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || "";

export default defineConfig({
  schema: "./prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    // Use DATABASE_URL (pooled, port 6543) as the primary connection.
    // Supabase's Supavisor handles DDL operations correctly on this port.
    // Falls back to DIRECT_URL if DATABASE_URL is not set.
    // sanitizeDatabaseUrl encodes special characters in the password.
    url: sanitizeDatabaseUrl(rawUrl),
  },
})
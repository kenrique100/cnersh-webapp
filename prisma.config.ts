// prisma.config.ts
import { defineConfig } from "prisma/config"
import "dotenv/config"
import { sanitizeDatabaseUrl } from "./src/lib/sanitize-db-url"

const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "./prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    // Use direct connection for migrations (non-pooled)
    // sanitizeDatabaseUrl encodes special characters in the password
    url: sanitizeDatabaseUrl(rawUrl),
  },
})
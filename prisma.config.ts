import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    // Use the direct (non-pooled) connection for migrations so Prisma
    // doesn't time out waiting for a pooler slot.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});

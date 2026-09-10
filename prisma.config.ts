import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    // Registering the seed here is what lets `prisma migrate reset` (npm run
    // db:reset) leave a usable database behind. Without it the reset replays
    // every migration and stops, leaving no accounts to sign in with.
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    // Use the direct (non-pooled) connection for migrations so Prisma
    // doesn't time out waiting for a pooler slot.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});

import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    // ── Path aliases ─────────────────────────────────────────────
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/generated/prisma(.*)$": "<rootDir>/src/generated/prisma$1",

    // ── Local mocks for Next.js ──────────────────────────────────
    "^next/server$": "<rootDir>/src/__mocks__/next/server.ts",
    "^next/navigation$": "<rootDir>/src/__mocks__/next/navigation.ts",

    // ── ESM-only `better-auth` family ────────────────────────────
    // Redirect every entry point the app imports to a CJS stub so
    // Jest never has to require() the .mjs files under
    // node_modules/better-auth/dist/.
    //
    // Order matters: more specific paths must come first.
    "^better-auth/plugins/admin/access$":
        "<rootDir>/src/__mocks__/better-auth-plugins-admin-access.ts",
    "^better-auth/plugins/access$":
        "<rootDir>/src/__mocks__/better-auth-plugins-access.ts",
    "^better-auth/plugins$":
        "<rootDir>/src/__mocks__/better-auth-plugins.ts",
    "^better-auth/adapters/prisma$":
        "<rootDir>/src/__mocks__/better-auth-prisma-adapter.ts",
    "^better-auth/next-js$":
        "<rootDir>/src/__mocks__/better-auth-next-js.ts",
    "^better-auth$": "<rootDir>/src/__mocks__/better-auth.ts",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(sanitize-html|htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)/)",
  ],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.[jt]s?(x)",
    "<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/e2e/",
    "<rootDir>/tests/",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
    "!src/**/__tests__/**",
    "!src/__mocks__/**",
    "!src/generated/**",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

export default createJestConfig(config);
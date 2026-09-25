// ---------------------------------------------------------------------------
// jest.setup.ts
//
// Runs after the test framework is installed (setupFilesAfterEnv).
// ---------------------------------------------------------------------------

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { TextEncoder, TextDecoder } from "util";

// ---------------------------------------------------------------------------
// Polyfills
// ---------------------------------------------------------------------------

if (!globalThis.structuredClone) {
    globalThis.structuredClone = <T>(obj: T): T =>
        JSON.parse(JSON.stringify(obj)) as T;
}

Object.assign(global, { TextDecoder, TextEncoder });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Global better-auth plugin mocks
//
// `@/lib/permissions` imports `createAccessControl` from
// "better-auth/plugins/access" at module load time. That package ships ESM
// (.mjs) that `next/jest`'s SWC transform does not process by default, which
// causes:
//
//   Must use import to load ES Module:
//     .../better-auth/dist/plugins/access/index.mjs
//
// Mocking these modules globally means the real ESM files are never required,
// so any test that (directly or transitively) imports `@/lib/permissions`
// works without per-file mocks.
//
// Variables inside the factory MUST start with `mock` — Jest's hoisting
// plugin only allows that prefix to bypass the temporal dead zone.
// ---------------------------------------------------------------------------

jest.mock("better-auth/plugins/access", () => ({
    createAccessControl: jest.fn(() => ({
        newRole: jest.fn((statements: unknown) => statements),
    })),
}));

jest.mock("better-auth/plugins/admin/access", () => ({
    defaultStatements: {},
    adminAc: { statements: {} },
}));

// ---------------------------------------------------------------------------
// Per-test cleanup
// ---------------------------------------------------------------------------

afterEach(() => {
    cleanup();
});
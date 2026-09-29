// ---------------------------------------------------------------------------
// jest.setup.ts
//
// Runs after the test framework is installed (setupFilesAfterEnv).
// ---------------------------------------------------------------------------

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { TextEncoder, TextDecoder } from "util";

if (!globalThis.structuredClone) {
    globalThis.structuredClone = <T>(obj: T): T =>
        JSON.parse(JSON.stringify(obj)) as T;
}

Object.assign(global, { TextDecoder, TextEncoder });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("better-auth/plugins/access", () => ({
    createAccessControl: jest.fn(() => ({
        newRole: jest.fn((statements: unknown) => statements),
    })),
}));

jest.mock("better-auth/plugins/admin/access", () => ({
    defaultStatements: {},
    adminAc: { statements: {} },
}));

afterEach(() => {
    cleanup();
});
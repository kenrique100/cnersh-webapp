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

/**
 * jsdom does not implement ResizeObserver. Components that observe size
 * (e.g. the cookie banner publishing its measured height as a CSS variable)
 * would throw `ReferenceError: ResizeObserver is not defined` during the
 * first effect pass.
 *
 * The shim is a no-op: tests assert observable side effects (attribute,
 * variable, callback invocation) rather than real measured dimensions.
 */
if (typeof globalThis.ResizeObserver === "undefined") {
    class ResizeObserverStub {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
    }
    globalThis.ResizeObserver =
        ResizeObserverStub as unknown as typeof ResizeObserver;
}

/**
 * Same story for IntersectionObserver. No-op shim keeps future components
 * (lazy-loaded dialogs, scroll-driven animations) testable without pulling a
 * real polyfill into the test environment.
 */
if (typeof globalThis.IntersectionObserver === "undefined") {
    class IntersectionObserverStub {
        root: Element | Document | null = null;
        rootMargin = "";
        thresholds: ReadonlyArray<number> = [];
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
        takeRecords(): IntersectionObserverEntry[] {
            return [];
        }
    }
    globalThis.IntersectionObserver =
        IntersectionObserverStub as unknown as typeof IntersectionObserver;
}

afterEach(() => {
    cleanup();
});
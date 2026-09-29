/**
 * Tests for the client-side Sentry initialization.
 *
 * The "Report a Bug" button is not a React component. It is the Sentry
 * Feedback Widget, injected into a shadow-DOM host on `document.body` by
 * `feedbackIntegration`. We disable Sentry's auto-injection and create the
 * widget manually so that we can remove it after 10 seconds. These tests
 * exercise the module's two responsibilities:
 *
 *   1. `feedbackIntegration` is configured with `autoInject: false` and the
 *      original options (placement, onSubmitSuccess, …) are preserved.
 *   2. The widget is created immediately and removed exactly once after
 *      10 seconds.
 *
 * Notes on the jsdom environment:
 *   - jsdom does not define `globalThis.fetch`. We assign a fresh `jest.fn()`
 *     in `beforeEach` rather than using `jest.spyOn`, which would throw.
 *   - jsdom does not define `Response` / `Request` / `Headers` either. The
 *     code under test never inspects the response — it only chains a
 *     `.catch()` — so the mock returns a plain `{ ok, status }` object.
 */
import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs", () => {
    const init = jest.fn();
    const feedbackIntegration = jest.fn(() => ({ name: "Feedback" }));
    const replayIntegration = jest.fn(() => ({ name: "Replay" }));
    const captureRouterTransitionStart = jest.fn();
    const createWidget = jest.fn(() => ({ removeFromDom: jest.fn() }));
    const getFeedback = jest.fn(() => ({ createWidget }));
    return {
        __esModule: true,
        init,
        feedbackIntegration,
        replayIntegration,
        captureRouterTransitionStart,
        getFeedback,
        // Exported for test introspection.
        __createWidget: createWidget,
        __getFeedback: getFeedback,
    };
});

type SentryMock = typeof Sentry & {
    __createWidget: jest.Mock;
    __getFeedback: jest.Mock;
};

const mockedSentry = Sentry as unknown as SentryMock;

/** The fetch mock installed for the current test. */
let fetchMock: jest.Mock;

/**
 * Import the module under test fresh. `instrumentation-client.ts` runs at
 * import time, so `jest.isolateModules()` plus a fresh `require` is how we
 * exercise it more than once.
 */
function loadModule(): void {
    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@/instrumentation-client");
    });
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Install a fresh fetch mock. jsdom does not define globalThis.fetch, so
    // we assign it directly rather than using jest.spyOn.
    fetchMock = jest.fn();
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;

    // Simulate a fully-parsed document so the immediate path runs.
    Object.defineProperty(document, "readyState", {
        configurable: true,
        get: () => "complete",
    });
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe("instrumentation-client", () => {
    describe("feedbackIntegration configuration", () => {
        it("disables auto-injection and preserves the original options", () => {
            loadModule();

            const calls = (Sentry.feedbackIntegration as jest.Mock).mock.calls;
            expect(calls).toHaveLength(1);

            const options = calls[0][0] as Record<string, unknown>;

            expect(options.autoInject).toBe(false);
            expect(options.placement).toBe("bottom-right");
            expect(options.colorScheme).toBe("system");
            expect(options.showName).toBe(false);
            expect(options.isEmailRequired).toBe(true);
            expect(typeof options.onSubmitSuccess).toBe("function");
        });

        it("onSubmitSuccess POSTs to /api/sentry-feedback with the email and message", () => {
            loadModule();

            const options = (Sentry.feedbackIntegration as jest.Mock).mock
                .calls[0][0] as {
                onSubmitSuccess: (feedback: {
                    email?: string;
                    message?: string;
                }) => void;
            };

            // The handler never inspects the response, so a plain object is
            // enough and avoids needing jsdom's missing `Response` class.
            fetchMock.mockResolvedValue({ ok: true, status: 200 });

            options.onSubmitSuccess({
                email: "user@example.com",
                message: "Something went wrong",
            });

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe("/api/sentry-feedback");
            expect(init.method).toBe("POST");
            expect(
                (init.headers as Record<string, string>)["Content-Type"]
            ).toBe("application/json");

            const body = JSON.parse(init.body as string);
            expect(body).toEqual({
                email: "user@example.com",
                message: "Something went wrong",
            });
        });

        it("onSubmitSuccess swallows network errors without throwing", () => {
            loadModule();

            const options = (Sentry.feedbackIntegration as jest.Mock).mock
                .calls[0][0] as {
                onSubmitSuccess: (feedback: {
                    email?: string;
                    message?: string;
                }) => void;
            };

            // The production handler chains `.catch()` on the promise returned
            // by fetch, so a rejected mock exercises the swallow path.
            fetchMock.mockRejectedValue(new Error("offline"));

            expect(() =>
                options.onSubmitSuccess({
                    email: "user@example.com",
                    message: "Something went wrong",
                })
            ).not.toThrow();
        });
    });

    describe("widget lifetime", () => {
        it("creates the widget on load and does not remove it immediately", () => {
            loadModule();

            expect(mockedSentry.__getFeedback).toHaveBeenCalledTimes(1);
            expect(mockedSentry.__createWidget).toHaveBeenCalledTimes(1);

            const { removeFromDom } = mockedSentry.__createWidget.mock
                .results[0].value as { removeFromDom: jest.Mock };
            expect(removeFromDom).not.toHaveBeenCalled();
        });

        it("has not removed the widget at 9,999 ms", () => {
            loadModule();

            jest.advanceTimersByTime(9_999);

            const { removeFromDom } = mockedSentry.__createWidget.mock
                .results[0].value as { removeFromDom: jest.Mock };
            expect(removeFromDom).not.toHaveBeenCalled();
        });

        it("removes the widget exactly once at 10,000 ms", () => {
            loadModule();

            jest.advanceTimersByTime(10_000);

            const { removeFromDom } = mockedSentry.__createWidget.mock
                .results[0].value as { removeFromDom: jest.Mock };
            expect(removeFromDom).toHaveBeenCalledTimes(1);
        });

        it("does not throw when Sentry has no Feedback instance registered", () => {
            mockedSentry.__getFeedback.mockReturnValueOnce(null);

            expect(() => loadModule()).not.toThrow();

            jest.advanceTimersByTime(10_000);
        });
    });

    describe("DOMContentLoaded path", () => {
        it("waits for DOMContentLoaded before creating the widget when still loading", () => {
            Object.defineProperty(document, "readyState", {
                configurable: true,
                get: () => "loading",
            });

            const addEventListenerSpy = jest.spyOn(document, "addEventListener");

            loadModule();

            expect(mockedSentry.__createWidget).not.toHaveBeenCalled();

            const listener = addEventListenerSpy.mock.calls.find(
                ([event]) => event === "DOMContentLoaded"
            )?.[1] as () => void;
            expect(typeof listener).toBe("function");

            listener();

            expect(mockedSentry.__createWidget).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(10_000);
            const { removeFromDom } = mockedSentry.__createWidget.mock
                .results[0].value as { removeFromDom: jest.Mock };
            expect(removeFromDom).toHaveBeenCalledTimes(1);
        });
    });
});
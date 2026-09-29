// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust this value in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Only enable debug in development
    debug: process.env.NODE_ENV === "development",

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    environment: process.env.NODE_ENV,

    sendDefaultPii: true,

    integrations: [
        Sentry.replayIntegration(),
        Sentry.feedbackIntegration({
            // Sentry injects the button automatically by default. We disable
            // that so we can control its lifetime below: it should be visible
            // for the first 10 seconds after a full page load, then removed.
            autoInject: false,
            colorScheme: "system",
            showName: false,
            isEmailRequired: true,
            // Position of the report bug icon on the web Ui
            placement: "bottom-right",
            onSubmitSuccess: (feedback: { email?: string; message?: string }) => {
                fetch("/api/sentry-feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: feedback.email,
                        message: feedback.message,
                    }),
                }).catch((err) => {
                    if (process.env.NODE_ENV === "development") {
                        console.error("Failed to notify admins of Sentry feedback:", err);
                    }
                });
            },
        }),
    ],
});

/**
 * Create the Feedback widget button and remove it from the DOM after 10 s.
 *
 * Why manual creation: with `autoInject: true`, Sentry inserts the button the
 * moment the integration is registered. We want the button to disappear on
 * its own after a short window, and Sentry exposes no timer option. By
 * disabling auto-injection and calling `createWidget()` ourselves, we keep
 * the exact same button (same handlers, same `onSubmitSuccess`) but gain a
 * handle we can use to call `removeFromDom()` on a timer.
 *
 * `removeFromDom()` removes only the button, not the form. If a user opens
 * the form before the timer fires, their in-progress report is preserved.
 */
function scheduleFeedbackButtonRemoval(): void {
    const feedback = Sentry.getFeedback();
    if (!feedback) return;
    const widget = feedback.createWidget();
    setTimeout(() => {
        widget.removeFromDom();
    }, 10_000);
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        // `createWidget` appends into a shadow-DOM host on `document.body`.
        // That host may not exist yet while the document is still parsing,
        // so wait for DOMContentLoaded the same way Sentry does internally.
        document.addEventListener("DOMContentLoaded", scheduleFeedbackButtonRemoval, {
            once: true,
        });
    } else {
        scheduleFeedbackButtonRemoval();
    }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
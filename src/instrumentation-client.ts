// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust this value in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Only enable debug in development
    debug: process.env.NODE_ENV === "development",

    // Enable Session Replay for better debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    environment: process.env.NODE_ENV,

    // tunnel: "/monitoring",

    sendDefaultPii: true, // Add this if you need user PII

    integrations: [
        Sentry.replayIntegration(),
        Sentry.feedbackIntegration({
            colorScheme: "system",
            isEmailRequired: true,
            placement: "bottom-left",
            onSubmitSuccess: (feedback: { name?: string; email?: string; message?: string }) => {
                fetch("/api/sentry-feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: feedback.name,
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
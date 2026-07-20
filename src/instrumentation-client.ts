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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
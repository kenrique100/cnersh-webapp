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

    // Optional: Set environment (staging, production, etc.)
    environment: process.env.NODE_ENV,

    // Route Sentry requests through the Next.js app to avoid ad-blockers.
    // The /monitoring API route is set up via withSentryConfig tunnelRoute in next.config.ts.
    tunnel: "/monitoring",

    integrations: [
        Sentry.replayIntegration(),
        Sentry.feedbackIntegration({
            colorScheme: "system",
            isEmailRequired: true,
        }),
    ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

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

    integrations: [
        Sentry.replayIntegration(),
    ],

    // Optional: Set environment (staging, production, etc.)
    environment: process.env.NODE_ENV,
    tunnel: "/monitoring",
});
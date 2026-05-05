// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import type { ErrorEvent } from "@sentry/nextjs";

// Tracks recently-notified fingerprints so admins aren't spammed for repeated errors.
// Cleared per fingerprint after a 60-second cooldown.
const recentlyNotified = new Set<string>();

Sentry.init({
  dsn: "https://361bf722462cf049274413b86888649a@o4511329679441920.ingest.de.sentry.io/4511329868775504",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  beforeSend(event: ErrorEvent) {
    if (event.level === "error" || event.level === "fatal") {
      const key =
        event.fingerprint?.join("-") ??
        event.exception?.values?.[0]?.type ??
        "sentry-error";

      if (!recentlyNotified.has(key)) {
        recentlyNotified.add(key);
        setTimeout(() => recentlyNotified.delete(key), 60_000);

        const errorType = event.exception?.values?.[0]?.type ?? "Error";
        const errorValue =
          event.exception?.values?.[0]?.value ??
          event.message ??
          "An error occurred";
        const url = event.request?.url ?? "";

        import("./src/lib/notify-admins")
          .then(({ notifyAdmins }) =>
            notifyAdmins({
              type: "SYSTEM",
              message: `[Sentry] ${errorType}: ${errorValue}${url ? ` — ${url}` : ""}`,
              link: "/admin",
            })
          )
          .catch((err) => console.error("[Sentry beforeSend] Admin notification failed:", err));
      }
    }

    return event;
  },
});

"use client";

import React from "react";

const CONSENT_KEY = "cookie-consent-choice";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

type ConsentChoice = "accepted" | "rejected";

/**
 * "unstored" means no valid choice is saved, so the banner should show.
 * "unknown" is the server's answer: it cannot read the visitor's storage.
 */
type ConsentSnapshot = ConsentChoice | "unstored" | "unknown";

const listeners = new Set<() => void>();

function emitConsentChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribeToConsent(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab may record a choice.
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readConsent(): ConsentSnapshot {
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return stored === "accepted" || stored === "rejected" ? stored : "unstored";
  } catch {
    // localStorage throws when storage is disabled or partitioned.
    return "unstored";
  }
}

function readServerConsent(): ConsentSnapshot {
  return "unknown";
}

export default function CookieConsentBanner() {
  /*
    The stored choice is read through useSyncExternalStore rather than a lazy
    useState initializer. An initializer runs during the first client render and
    would report a visible banner where the server rendered nothing; React then
    sees mismatched markup, hydration of the whole tree fails, and every client
    component below it is discarded and re-created.

    useSyncExternalStore hydrates against the server snapshot and only then
    switches to the real one, so the markup agrees on the first pass and the
    banner appears immediately afterwards - without setting state from an effect.
  */
  const consent = React.useSyncExternalStore(
    subscribeToConsent,
    readConsent,
    readServerConsent,
  );

  const visible = consent === "unstored";

  const saveChoice = (choice: ConsentChoice): void => {
    try {
      window.localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // A blocked write must not stop the cookie from being set below.
    }

    document.cookie = [
      `cookie_consent=${choice}`,
      `path=/`,
      `max-age=${CONSENT_MAX_AGE_SECONDS}`,
      `SameSite=Lax`,
    ].join("; ");

    emitConsentChange();
  };

  if (!visible) return null;

  return (
      <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-4">
        <div className="mx-auto max-w-6xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            We use cookies to improve your experience. You can accept all or reject
            all non-essential cookies.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
                type="button"
                onClick={() => saveChoice("rejected")}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Reject All
            </button>
            <button
                type="button"
                onClick={() => saveChoice("accepted")}
                className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
  );
}
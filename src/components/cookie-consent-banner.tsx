"use client";

import React from "react";
import { getCookieDomain } from "@/lib/cookie-domain";

const CONSENT_KEY = "cookie-consent-choice";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

type ConsentChoice = "accepted" | "rejected";

/**
 * Clears Google Translate cookies on both the root path and, if applicable,
 * the registered domain.  Must be called client-side only.
 *
 * Google Translate sets two cookies:
 *   - googtrans   (path=/, domain=<hostname>)
 *   - googtrans   (path=/, no explicit domain — defaults to current host)
 */
function clearTranslateCookies(): void {
  const expiry = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";

  // Always clear the host-scoped cookie
  document.cookie = `googtrans=; ${expiry}`;

  // Also clear with explicit domain if we are on a production custom domain
  const domain = getCookieDomain(window.location.hostname);
  if (domain) {
    document.cookie = `googtrans=; ${expiry}; domain=${domain}`;
    // Google Translate also sets the cookie on the root domain (without subdomain)
    // so strip leading subdomain segment if present (e.g. "www.example.com" → "example.com")
    const parts = domain.split(".");
    if (parts.length > 2) {
      const rootDomain = parts.slice(-2).join(".");
      document.cookie = `googtrans=; ${expiry}; domain=${rootDomain}`;
    }
  }
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const choice = window.localStorage.getItem(CONSENT_KEY) as ConsentChoice | null;
    setVisible(choice !== "accepted" && choice !== "rejected");
  }, []);

  const saveChoice = (choice: ConsentChoice): void => {
    window.localStorage.setItem(CONSENT_KEY, choice);

    // Persist the consent cookie with correct domain handling.
    // Intentionally omit Secure here — Next.js middleware can upgrade to HTTPS,
    // and the cookie needs to work on localhost too.
    const domain = getCookieDomain(window.location.hostname);
    const domainAttr = domain ? `; domain=${domain}` : "";
    document.cookie = [
      `cookie_consent=${choice}`,
      `path=/`,
      `max-age=${CONSENT_MAX_AGE_SECONDS}`,
      `SameSite=Lax`,
      domainAttr,
    ]
      .filter(Boolean)
      .join("; ");

    if (choice === "rejected") {
      clearTranslateCookies();
    }

    setVisible(false);
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

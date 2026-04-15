/**
 * translate.ts
 *
 * Google Translate language-switching utility.
 *
 * WHY THIS EXISTS:
 * Google Translate controls the selected language via the `googtrans` cookie
 * with the format "/auto/<lang>" (e.g. "/auto/fr", "/auto/en").
 * If the old cookie is not explicitly cleared before setting a new one,
 * the browser can serve the cached/stale language because:
 *   1. The cookie may exist at multiple domain scopes (host + root domain).
 *   2. The widget reads the FIRST matching cookie it finds.
 *
 * This helper nukes all existing `googtrans` cookies at every scope,
 * sets the new language at the correct scope, then forces a page reload
 * so the Google Translate widget re-initialises with the fresh cookie.
 *
 * USAGE (client components only):
 *   import { setGoogleTranslateLanguage, resetGoogleTranslate } from "@/lib/translate";
 *
 *   // Switch to French
 *   setGoogleTranslateLanguage("fr");
 *
 *   // Reset to original (no translation)
 *   resetGoogleTranslate();
 */

"use client";

import { getCookieDomain } from "@/lib/cookie-domain";

/** ISO 639-1 language codes supported by Google Translate */
export type GoogleTranslateLang =
  | "en" | "fr" | "es" | "de" | "it" | "pt" | "ru" | "zh" | "ja" | "ko"
  | "ar" | "hi" | "sw" | "yo" | "ha" | "ig" | "am" | "so" | "zu" | "af"
  | (string & {}); // allow any BCP-47 code

const COOKIE_NAME = "googtrans";
const EXPIRE_PAST = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
const COOKIE_OPTS = "path=/; max-age=31536000; SameSite=Lax"; // 1 year

/**
 * Returns every domain scope we should touch:
 *   1. No explicit domain  (host-only / current origin)
 *   2. The registered domain returned by getCookieDomain (e.g. "example.com")
 *   3. If on a subdomain, the root domain  (e.g. "example.com" from "www.example.com")
 *
 * Vercel preview/production deployments (.vercel.app) return null from
 * getCookieDomain, so only scope 1 is used — correct behaviour.
 */
function getCookieScopes(hostname: string): Array<string | null> {
  const domain = getCookieDomain(hostname);
  const scopes: Array<string | null> = [null]; // null = no explicit domain attr

  if (domain) {
    scopes.push(domain);
    // Also clear/set root domain if we are on a subdomain
    const parts = domain.split(".");
    if (parts.length > 2) {
      scopes.push(parts.slice(-2).join("."));
    }
  }

  return scopes;
}

/**
 * Clear the `googtrans` cookie at every domain scope.
 */
function clearGoogTrans(hostname: string): void {
  for (const scope of getCookieScopes(hostname)) {
    const domainAttr = scope ? `; domain=${scope}` : "";
    document.cookie = `${COOKIE_NAME}=; ${EXPIRE_PAST}${domainAttr}`;
  }
}

/**
 * Set the `googtrans` cookie at every relevant domain scope.
 */
function setGoogTrans(hostname: string, value: string): void {
  for (const scope of getCookieScopes(hostname)) {
    const domainAttr = scope ? `; domain=${scope}` : "";
    document.cookie = `${COOKIE_NAME}=${value}; ${COOKIE_OPTS}${domainAttr}`;
  }
}

/**
 * Switch the Google Translate language.
 *
 * Clears all existing googtrans cookies, sets /auto/<lang>,
 * then reloads the page so the widget picks up the new value.
 *
 * @param lang  ISO 639-1 language code, e.g. "fr", "en", "ar"
 */
export function setGoogleTranslateLanguage(lang: GoogleTranslateLang): void {
  if (typeof window === "undefined") return; // guard against SSR calls

  const hostname = window.location.hostname;

  // Step 1: nuke every existing cookie at every scope
  clearGoogTrans(hostname);

  // Step 2: set the new language value
  setGoogTrans(hostname, `/auto/${lang}`);

  // Step 3: force a full reload so the widget re-initialises
  window.location.reload();
}

/**
 * Remove Google Translate entirely (restore original language).
 * Clears all googtrans cookies and reloads.
 */
export function resetGoogleTranslate(): void {
  if (typeof window === "undefined") return;
  clearGoogTrans(window.location.hostname);
  window.location.reload();
}

/**
 * Read the currently active Google Translate language from the cookie.
 * Returns null if no translation is active.
 *
 * Example: "/auto/fr" → "fr"
 */
export function getActiveGoogleTranslateLang(): GoogleTranslateLang | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return null;

  const value = cookie.split("=")[1]; // e.g. "/auto/fr"
  const match = value?.match(/^\/auto\/(.+)$/);
  return match?.[1] ?? null;
}

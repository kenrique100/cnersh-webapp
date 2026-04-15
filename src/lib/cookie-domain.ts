/**
 * Returns the cookie domain attribute value for the given hostname.
 *
 * Rules:
 *  - localhost, raw IPv4/IPv6 addresses → return null (browser ignores Domain on these)
 *  - *.vercel.app preview/production deployments → return null so the cookie is
 *    scoped to the exact hostname rather than the shared .vercel.app TLD
 *  - custom domains with at least one dot → return the hostname so the cookie is
 *    valid across sub-domains (e.g. www.example.com + api.example.com)
 *
 * Why null for vercel.app?
 *   Setting Domain=.vercel.app would share cookies across ALL Vercel-hosted apps,
 *   which is a security risk.  Omitting the Domain attribute is safer and still
 *   works because the browser defaults to the exact request host.
 */

export const isLikelyIpv4Address = (hostname: string): boolean =>
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(hostname);

export const isLikelyIpv6Address = (hostname: string): boolean =>
  hostname.startsWith("[") && hostname.endsWith("]");

/**
 * getCookieDomain
 * @param hostname - window.location.hostname or req.headers.host (strip port first)
 * @returns string to use as the Domain cookie attribute, or null to omit it
 */
export const getCookieDomain = (hostname: string): string | null => {
  // Strip optional port (e.g. "localhost:3000" → "localhost")
  const host = hostname.split(":")[0] ?? hostname;

  if (
    !host ||
    host === "localhost" ||
    isLikelyIpv4Address(host) ||
    isLikelyIpv6Address(host) ||
    // Single-label hostnames (no dot) — e.g. internal docker service names
    !host.includes(".") ||
    // Vercel shared domain — scoping to .vercel.app is insecure
    host.endsWith(".vercel.app") ||
    host === "vercel.app"
  ) {
    return null;
  }

  // For all other production/custom domains, return the hostname so that cookies
  // are shared across sub-domains automatically (browser prepends the dot).
  return host;
};

/**
 * Sanitizes a PostgreSQL connection string by URL-encoding special characters
 * in the password portion. Supabase and other providers may generate passwords
 * containing characters like `/`, `?`, `@`, `#`, etc. that break URL parsing
 * if not properly percent-encoded.
 *
 * Accepts formats like:
 *   postgresql://user:p@ss/word@host:5432/db?opt=val
 *
 * Returns:
 *   postgresql://user:p%40ss%2Fword@host:5432/db?opt=val
 */
export function sanitizeDatabaseUrl(url: string): string {
  if (!url) return url;

  // Match: scheme://user:password@host...
  const match = url.match(
    /^(postgresql|postgres)(:\/\/)([^:]+):(.+)@([^@]+)$/
  );
  if (!match) return url;

  const [, scheme, schemeSeparator, user, rawPassword, hostAndRest] = match;
  const encodedPassword = encodeURIComponent(rawPassword);
  return `${scheme}${schemeSeparator}${user}:${encodedPassword}@${hostAndRest}`;
}

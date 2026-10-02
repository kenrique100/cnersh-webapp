import { type NextRequest, NextResponse } from "next/server";

import { buildContentSecurityPolicy, createCspNonce } from "@/lib/csp";

const PROTECTED_PREFIXES = [
    "/dashboard",
    "/feeds",
    "/projects",
    "/protocols",
    "/evaluations",
    "/appeals",
    "/aar",
    "/sae",
    "/profile",
    "/notifications",
    "/support",
    "/pages/support",
    "/community",
    "/admin",
] as const;

function isProtectedPath(pathname: string): boolean {
    return PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}

/**
 * Better Auth's default session cookie. HTTPS deployments may use the
 * __Secure- prefix.
 *
 * The proxy only checks *presence* of the cookie. It does not authenticate
 * against Redis or the database. Authoritative verification happens in the
 * server layout via `authIsRequired()`, which uses the cached
 * `authSession()` lookup.
 *
 * @see https://better-auth.com/docs/plugins/test-utils
 */
function hasSessionCookie(request: NextRequest): boolean {
    return (
        request.cookies.has("better-auth.session_token") ||
        request.cookies.has("__Secure-better-auth.session_token")
    );
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    const nonce = createCspNonce();
    const csp = buildContentSecurityPolicy({
        nonce,
        isDevelopment: process.env.NODE_ENV !== "production",
    });

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);

    if (isProtectedPath(pathname) && !hasSessionCookie(request)) {
        // No session cookie at all → definitely unauthenticated. Redirect
        // here so unauthenticated users never reach the layout. Everything
        // else (invalid cookie, expired session, unverified user) is handled
        // authoritatively by `authIsRequired()` in the layout.
        const url = request.nextUrl.clone();
        url.pathname = "/sign-in";
        url.search = "";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
}

export const config = {
    matcher: [
        "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:js|css|png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|map|txt|xml|json|pdf)$).*)",
    ],
};
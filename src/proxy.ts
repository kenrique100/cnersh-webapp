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
const AUTH_PREFIXES = [
    "/sign-in",
    "/sign-up",
    "/verify-email",
    "/request-password",
    "/reset-password",
] as const;

function isProtectedPath(pathname: string): boolean {
    return PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

function isAuthPath(pathname: string): boolean {
    return AUTH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}
function hasSessionCookie(request: NextRequest): boolean {
    return (
        request.cookies.has("better-auth.session_token") ||
        request.cookies.has("__Secure-better-auth.session_token")
    );
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;
    const isDevelopment = process.env.NODE_ENV !== "production";

    const needsNonce = isProtectedPath(pathname) || isAuthPath(pathname);

    let csp: string;
    const requestHeaders = new Headers(request.headers);

    if (needsNonce) {
        const nonce = createCspNonce();
        csp = buildContentSecurityPolicy({ nonce, isDevelopment });
        requestHeaders.set("x-nonce", nonce);
    } else {
        csp = buildContentSecurityPolicy({ isDevelopment });
    }

    requestHeaders.set("Content-Security-Policy", csp);

    if (isProtectedPath(pathname) && !hasSessionCookie(request)) {
        const url = request.nextUrl.clone();
        url.pathname = "/sign-in";
        url.search = "";
        url.searchParams.set("next", pathname);
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.headers.set("Content-Security-Policy", csp);
        return redirectResponse;
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
import { type NextRequest, NextResponse } from "next/server";

import { buildContentSecurityPolicy, createCspNonce } from "@/lib/csp";
import { auth } from "@/lib/auth";
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

    if (isProtectedPath(pathname)) {
        // Authoritative check: server-side session, not a client cookie value.
        const session = await auth.api
            .getSession({ headers: request.headers })
            .catch(() => null);

        // Case A — unauthenticated.
        if (!session) {
            const url = request.nextUrl.clone();
            url.pathname = "/sign-in";
            url.search = "";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
        }

        // Case B — authenticated but not verified.
        if (!session.user.emailVerified) {
            const url = request.nextUrl.clone();
            url.pathname = "/verify-email";
            url.search = "";
            return NextResponse.redirect(url);
        }

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
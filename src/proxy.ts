// src/proxy.ts
import { type NextRequest, NextResponse } from "next/server";

import { buildContentSecurityPolicy, createCspNonce } from "@/lib/csp";
import { auth } from "@/lib/auth";

/**
 * Route prefixes that require BOTH authentication and a verified email.
 * Everything not listed here is treated as public (marketing, auth flows,
 * verify-email, password reset, public informational pages, etc.).
 *
 * Keeping this as an explicit allow-list is safer than a deny-list:
 * adding a new protected section requires an intentional edit here.
 */
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
    "/community",
    "/admin",
] as const;

function isProtectedPath(pathname: string): boolean {
    return PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}

/**
 * Next.js 16 proxy (successor to middleware). Always runs on the Node.js
 * runtime — do NOT declare `runtime` in `config`, it is rejected at build.
 *
 * Responsibilities:
 *   1. Attach a per-request CSP nonce so Next.js can stamp inline bootstrap
 *      scripts (without this, React never hydrates in production).
 *   2. Enforce the email-verification boundary at the edge for protected
 *      routes. This is defence in depth only — server actions and API
 *      routes MUST independently call verifiedAuthSession().
 *
 * Decision matrix:
 *   No session               → /sign-in?next=<path>
 *   Session, emailVerified=f → /verify-email
 *   Session, emailVerified=t → allow
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // ---- 1. CSP nonce -----------------------------------------------------
    const nonce = createCspNonce();
    const csp = buildContentSecurityPolicy({
        nonce,
        isDevelopment: process.env.NODE_ENV !== "production",
    });

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);

    // ---- 2. Auth + email-verification gate --------------------------------
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

        // Case C — verified: fall through and allow.
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
}

export const config = {
    /**
     * Documents only. API routes serve JSON and keep their own headers from
     * next.config.ts; static assets and prefetches gain nothing from a policy
     * and would only add per-request work.
     *
     * NOTE: `runtime` is intentionally omitted. Next.js 16 rejects runtime
     * config in proxy.ts because the proxy always runs on Node.js.
     */
    matcher: [
        "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:js|css|png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|map|txt|xml|json|pdf)$).*)",
    ],
};
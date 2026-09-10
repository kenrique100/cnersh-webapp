import { type NextRequest, NextResponse } from "next/server";

import { buildContentSecurityPolicy, createCspNonce } from "@/lib/csp";

/**
 * Attaches a per-request Content Security Policy nonce to every document
 * response.
 *
 * The nonce is written onto the *request* headers as well as the response.
 * Next.js reads the incoming `Content-Security-Policy` header, finds the nonce,
 * and stamps it onto the inline bootstrap and hydration scripts it renders. A
 * static policy cannot do this, and without it React never hydrates in
 * production.
 */
export function middleware(request: NextRequest): NextResponse {
    const nonce = createCspNonce();
    const csp = buildContentSecurityPolicy({
        nonce,
        isDevelopment: process.env.NODE_ENV !== "production",
    });

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
}

export const config = {
    /**
     * Documents only. API routes serve JSON and keep their own headers from
     * next.config.ts; static assets and prefetches gain nothing from a policy
     * and would only add per-request work.
     */
    matcher: [
        "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:js|css|png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|map|txt|xml|json|pdf)$).*)",
    ],
};

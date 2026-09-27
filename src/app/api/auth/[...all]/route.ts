import { NextRequest, NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { validateEmailAddress } from "@/lib/email-validation";

const handlers = toNextJsHandler(auth);

type AuthAction = "sign-in" | "sign-up" | "password-reset" | "verify-email";

/**
 * Resolves the logical action for a Better Auth route.
 *
 * Note: `send-verification-email` (POST, resend) and `verify-email`
 * (GET, token click) are intentionally NOT both routed through here.
 * `getAuthAction` only maps POST endpoints — it is called from POST and
 * the GET wrapper handles its own path check below.
 */
function getAuthAction(pathname: string): AuthAction | null {
    if (pathname.includes("/sign-in/email")) return "sign-in";
    if (pathname.includes("/sign-up/email")) return "sign-up";
    if (pathname.includes("/forget-password")) return "password-reset";
    if (pathname.includes("/send-verification-email")) return "verify-email";
    return null;
}

export async function POST(req: NextRequest) {
    const action = getAuthAction(req.nextUrl.pathname);

    if (action === "sign-in") {
        const limited = await rateLimit(req, RATE_LIMITS.authSignIn, "auth-signin");
        if (limited) return limited;
    }
    if (action === "sign-up") {
        const limited = await rateLimit(req, RATE_LIMITS.authSignUp, "auth-signup");
        if (limited) return limited;
    }
    if (action === "password-reset") {
        const limited = await rateLimit(req, RATE_LIMITS.passwordReset, "auth-pwreset");
        if (limited) return limited;
    }
    if (action === "verify-email") {
        const limited = await rateLimit(req, RATE_LIMITS.verifyEmailResend, "auth-verify");
        if (limited) return limited;
    }

    // Email-shape validation. Only runs for actions we've mapped above,
    // and every one of those endpoints accepts an `email` field in the body.
    // The POST `/verify-email` token endpoint (if your version of Better Auth
    // exposes one) is intentionally NOT mapped here, so this block does not
    // run against a `{ token }` body.
    if (action) {
        const body = await req.clone().json().catch(() => null);
        const rawEmail = typeof body?.email === "string" ? body.email : "";
        const emailValidation = validateEmailAddress(rawEmail);
        if (!emailValidation.valid) {
            return NextResponse.json(
                { code: "INVALID_EMAIL", message: emailValidation.message },
                { status: 400 }
            );
        }
    }

    return handlers.POST(req);
}

export async function GET(req: NextRequest) {
    // Verification emails contain a link that, when clicked, issues a GET
    // to `/api/auth/verify-email?token=...`. Apply the same bucket as the
    // resend endpoint so a single link cannot be hammered and so all
    // verification traffic shares one budget.
    if (req.nextUrl.pathname.includes("/verify-email")) {
        const limited = await rateLimit(req, RATE_LIMITS.verifyEmailResend, "auth-verify");
        if (limited) return limited;
    }

    return handlers.GET(req);
}
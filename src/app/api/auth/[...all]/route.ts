import { NextRequest, NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { validateEmailAddress } from "@/lib/email-validation";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

function getAuthAction(pathname: string): "sign-in" | "sign-up" | null {
    if (pathname.includes("/sign-in/email")) return "sign-in";
    if (pathname.includes("/sign-up/email")) return "sign-up";
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
import "server-only";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/send-verification-email";

const CNERSH_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export const CNERSH_IDENTIFIER_PREFIX = "cnersh:";

export function cnershIdentifier(email: string): string {
    return `${CNERSH_IDENTIFIER_PREFIX}${email.toLowerCase().trim()}`;
}

function newId(): string {
    return randomBytes(16).toString("hex");
}

/**
 * Invalidate any existing CNERSH token for this email and create a fresh one.
 * The plain token is returned so the caller can put it in the verification URL.
 */
export async function createCnershToken(email: string): Promise<string> {
    const identifier = cnershIdentifier(email);
    await db.verification.deleteMany({ where: { identifier } });

    const token = randomBytes(32).toString("hex");
    await db.verification.create({
        data: {
            id: newId(),
            identifier,
            value: token,
            expiresAt: new Date(Date.now() + CNERSH_TOKEN_TTL_MS),
        },
    });
    return token;
}

export type ConsumeResult =
    | { ok: true; email: string }
    | { ok: false; reason: "not_found" | "expired" };

/**
 * Look up a token, ensure it has not expired, delete it, and return the email
 * it belongs to. Tokens are single-use.
 *
 * Consumed by `src/app/actions/verification.ts → confirmCnershVerification`.
 */
export async function consumeCnershToken(
    token: string
): Promise<ConsumeResult> {
    const row = await db.verification.findFirst({ where: { value: token } });
    if (!row) return { ok: false, reason: "not_found" };
    if (!row.identifier.startsWith(CNERSH_IDENTIFIER_PREFIX)) {
        return { ok: false, reason: "not_found" };
    }
    if (row.expiresAt.getTime() < Date.now()) {
        await db.verification.delete({ where: { id: row.id } }).catch(() => null);
        return { ok: false, reason: "expired" };
    }
    const email = row.identifier.slice(CNERSH_IDENTIFIER_PREFIX.length);
    await db.verification.delete({ where: { id: row.id } });
    return { ok: true, email };
}

/**
 * Build the CNERSH verification URL that the user clicks.
 * The base URL comes from env so staging and production produce different links.
 */
export function buildCnershUrl(token: string): string {
    const base =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.BETTER_AUTH_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000";
    const url = new URL("/verify-email/confirm", base);
    url.searchParams.set("token", token);
    return url.toString();
}

/**
 * Send the CNERSH verification email. Reuses the existing template and sender,
 * so the visual design and transport are unchanged.
 *
 * `sendVerificationEmail` expects a definite `userName: string`, so we fall
 * back to "User" whenever the account has no display name.
 */
export async function sendCnershVerificationEmail(user: {
    id: string;
    email: string;
    name?: string | null;
}): Promise<void> {
    const token = await createCnershToken(user.email);
    const url = buildCnershUrl(token);
    await sendVerificationEmail({
        to: user.email,
        verificationUrl: url,
        userName: user.name ?? "User",
    });
}
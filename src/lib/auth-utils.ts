import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { sendWelcomeEmail } from "./send-welcome-email";

/** Canonical error code thrown by verifiedAuthSession() for unverified users. */
export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED" as const;

/**
 * Returns the current server-side session, or null.
 * Use this ONLY when authentication alone (without email verification) is
 * intentionally sufficient. For anything that requires a verified account,
 * use verifiedAuthSession() instead.
 */
export const authSession = async () => {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        return session ?? null;
    } catch (error) {
        console.error("Session fetch failed:", error);
        return null;
    }
};

/**
 * Server-action / API guard for authenticated AND email-verified users.
 *
 * This is the application's single, authoritative server-side security
 * boundary for verified-only operations. It derives identity exclusively
 * from the server-side session (never from client-supplied IDs/fields).
 *
 * Throws:
 *   - Error("Unauthorized")          → no session
 *   - Error(EMAIL_NOT_VERIFIED)      → authenticated but email not verified
 */
export const verifiedAuthSession = async () => {
    const session = await authSession();

    if (!session) {
        throw new Error("Unauthorized");
    }

    if (!session.user.emailVerified) {
        throw new Error(EMAIL_NOT_VERIFIED);
    }

    return session;
};

/**
 * Page-level guard: redirects unauthenticated users to /sign-in and
 * authenticated-but-unverified users to /verify-email.
 * Also triggers the one-time welcome email.
 */
export const authIsRequired = async () => {
    const session = await authSession();

    if (!session) {
        redirect("/sign-in");
    }

    if (!session.user.emailVerified) {
        redirect("/verify-email");
    }

    await sendWelcomeEmailIfNeeded(session.user.id);

    return session;
};

/** Role-aware landing page after sign-in. */
export const getDashboardPath = (role?: string | null): string =>
    role === "admin" || role === "superadmin" ? "/admin" : "/dashboard";

/**
 * Page-level guard for public auth pages (sign-in / sign-up / etc.).
 * Sends already-verified users to their dashboard.
 */
export const authIsNotRequired = async () => {
    const session = await authSession();
    if (session?.user?.emailVerified) {
        redirect(getDashboardPath(session.user?.role));
    }
};

/**
 * One-time welcome email. Uses an atomic updateMany on welcomeEmailSent
 * to avoid double-sends under concurrency. Failures are swallowed so the
 * caller's request is never blocked by email delivery.
 */
async function sendWelcomeEmailIfNeeded(userId: string) {
    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true, emailVerified: true },
        });

        if (!user || !user.emailVerified || !user.email) return;

        const result = await db.user.updateMany({
            where: { id: userId, welcomeEmailSent: false },
            data: { welcomeEmailSent: true },
        });

        if (result.count === 0) {
            console.log(`Welcome email already sent for user ${userId}, skipping.`);
            return;
        }

        await sendWelcomeEmail({
            to: user.email,
            userName: user.name || "User",
        });

        console.log(`Welcome email sent for user ${userId}`);
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { sendWelcomeEmail } from "./send-welcome-email";

/** Canonical error code thrown by verifiedAuthSession() for unverified users. */
export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED" as const;

const isDynamicServerUsageError = (error: unknown): boolean =>
    !!error &&
    typeof error === "object" &&
    "digest" in error &&
    (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE";

/**
 * One authoritative session lookup per React server render.
 *
 * React cache() deduplicates calls to this function during the same
 * server render/request. API routes and independent requests still
 * perform their own authentication checks.
 */
export const authSession = cache(async () => {
    try {
        const session = await auth.api.getSession({ headers: await headers() });

        return session ?? null;
    } catch (error) {
        // Never swallow Next.js's dynamic-rendering signal.
        if (isDynamicServerUsageError(error)) {
            throw error;
        }

        console.error("Session fetch failed:", error);
        return null;
    }
});

/**
 * Requires an authenticated and email-verified session.
 *
 * Uses the cached authSession(), so multiple calls during the same server
 * render reuse a single underlying session lookup.
 */
export const verifiedAuthSession = cache(async () => {
    const session = await authSession();

    if (!session) {
        throw new Error("Unauthorized");
    }

    if (!session.user.emailVerified) {
        throw new Error(EMAIL_NOT_VERIFIED);
    }

    return session;
});

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
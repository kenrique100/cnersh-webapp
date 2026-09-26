import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { sendWelcomeEmail } from "./send-welcome-email";

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
 * Throws instead of redirecting so it can be used inside actions/routes.
 */
export const verifiedAuthSession = async () => {
    const session = await authSession();

    if (!session) {
        throw new Error("Unauthorized");
    }

    if (!session.user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
    }

    return session;
};

export const authIsRequired = async () => {
    const session = await authSession();
    if (!session) redirect("/sign-in");
    if (!session.user.emailVerified) redirect("/sign-in?unverified=1");

    await sendWelcomeEmailIfNeeded(session.user.id);

    return session;
};

export const getDashboardPath = (role?: string | null): string =>
    (role === "admin" || role === "superadmin") ? "/admin" : "/dashboard";

export const authIsNotRequired = async () => {
    const session = await authSession();
    if (session?.user?.emailVerified) redirect(getDashboardPath(session.user?.role));
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
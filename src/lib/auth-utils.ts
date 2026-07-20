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

export const authIsRequired = async () => {
    const session = await authSession();
    if (!session) redirect("/sign-in");

    // Send welcome email only once, atomically
    await sendWelcomeEmailIfNeeded(session.user.id);

    return session;
};

export const getDashboardPath = (role?: string | null): string =>
    (role === "admin" || role === "superadmin") ? "/admin" : "/dashboard";

export const authIsNotRequired = async () => {
    const session = await authSession();
    if (session) redirect(getDashboardPath(session.user?.role));
};

async function sendWelcomeEmailIfNeeded(userId: string) {
    try {
        // 1. Fetch user details (no lock)
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                name: true,
                emailVerified: true,
            },
        });

        // Guard against a missing/unverified user AND a null email.
        // This narrows `user.email` from `string | null` to `string`
        // for everything below, fixing the TS2345 errors.
        if (!user || !user.emailVerified || !user.email) return;

        const result = await db.user.updateMany({
            where: {
                id: userId,
                welcomeEmailSent: false, // only update if not sent
            },
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
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
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                name: true,
                emailVerified: true,
            },
        });

        if (!user || !user.emailVerified || !user.email) return;

        // Claim the send atomically so concurrent requests do not send duplicates.
        const result = await db.user.updateMany({
            where: {
                id: userId,
                welcomeEmailSent: false,
            },
            data: { welcomeEmailSent: true },
        });

        if (result.count === 0) {
            console.log(`Welcome email already sent for user ${userId}, skipping.`);
            return;
        }

        try {
            await sendWelcomeEmail({
                to: user.email,
                userName: user.name || "User",
            });
            console.log(`Welcome email sent for user ${userId}`);
        } catch (error) {
            // Do not permanently consume the one-time flag when the provider fails.
            // This allows the next authenticated request to retry the welcome email.
            await db.user.updateMany({
                where: { id: userId, welcomeEmailSent: true },
                data: { welcomeEmailSent: false },
            }).catch((resetError) => {
                console.error("Failed to reset welcome email flag:", resetError);
            });
            throw error;
        }
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}
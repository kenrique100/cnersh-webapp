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

    await sendWelcomeEmailIfNeeded(session.user.id);
    return session;
};

export const getDashboardPath = (role?: string | null): string =>
    (role === "admin" || role === "superadmin") ? "/admin" : "/dashboard";

export const authIsNotRequired = async () => {
    const session = await authSession();
    if (session) redirect(getDashboardPath(session.user?.role));
};

// Send welcome email once
async function sendWelcomeEmailIfNeeded(userId: string) {
    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                name: true,
                emailVerified: true,
                welcomeEmailSent: true,
            },
        });

        if (!user || !user.emailVerified || user.welcomeEmailSent) return;

        await sendWelcomeEmail({
            to: user.email,
            userName: user.name || "User",
        });

        await db.user.update({
            where: { id: userId },
            data: { welcomeEmailSent: true },
        });

        console.log(`Welcome email sent and marked for user ${userId}`);
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}
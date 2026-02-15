import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export const authSession = async () => {
    try {
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session) {
            return null;
        }

        return session;
    } catch (error) {
        console.error("Session fetch failed — user may need to sign in again:", error instanceof Error ? error.message : error);
        return null;
    }
};

export const authIsRequired = async () => {
    const session = await authSession();

    if (!session) {
        redirect("/sign-in");
    }

    return session;
};

/** Get the appropriate dashboard path for a user role */
export const getDashboardPath = (role?: string | null): string =>
    (role === "admin" || role === "superadmin") ? "/admin" : "/dashboard";

export const authIsNotRequired = async () => {
    const session = await authSession();

    if (session) {
        redirect(getDashboardPath(session.user?.role));
    }
};
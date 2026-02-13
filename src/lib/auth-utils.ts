import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export const authSession = async () => {
    try {
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session) {
            throw new Error("Unauthorized: No valid session found");
        }

        return session;
    } catch (error) {
        throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const authIsRequired = async () => {
    const session = await authSession();

    if (!session) {
        redirect("/sign-in");
    }

    return session;
};

export const authIsNotRequired = async () => {
    try {
        const session = await authSession();

        if (session) {
            redirect("/");
        }
    } catch {
        // No session or authentication failed - this is expected for unauthenticated pages
        // Do nothing and allow the page to render
    }
};
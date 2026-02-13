import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export const authSession = async () => {
    try {
        const session = auth.api.getSession({ headers: await headers() });

        if (!session) {
            throw new Error("Unauthorized: No valid session found");
        }

        return session;
    } catch {
        throw new Error("Authentication failed");
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
    const session = await authSession();

    if (session) {
        redirect("/");
    }
};
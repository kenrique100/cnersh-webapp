import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import VerifyEmail from "@/components/verify-email";
import { confirmCnershVerification } from "@/app/actions/verification";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams: Promise<{ email?: string; token?: string; resent?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
    const params = await searchParams;

    // If a token is present, verify it first. This runs on the server so the
    // user never sees a flash of "check your email" before success.
    if (params.token) {
        const result = await confirmCnershVerification(params.token);
        if (result.success) {
            // A freshly verified user may already be signed in.
            const hdrs = await headers();
            const session = await auth.api.getSession({ headers: hdrs });
            if (session?.user) redirect("/dashboard");
            redirect(`/sign-in?verified=1&email=${encodeURIComponent(result.email)}`);
        }
        return (
            <VerifyEmail
                status={result.reason === "expired" ? "expired" : "invalid"}
                email={params.email}
            />
        );
    }

    // Prefer the email from the session if we have one, otherwise from the query.
    let email = params.email ?? "";
    if (!email) {
        const hdrs = await headers();
        const session = await auth.api.getSession({ headers: hdrs });
        if (session?.user?.email) email = session.user.email;
    }

    // If the user is already verified, don't keep them here.
    if (email) {
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { cnershVerified: true },
        });
        if (user?.cnershVerified) {
            const hdrs = await headers();
            const session = await auth.api.getSession({ headers: hdrs });
            redirect(session?.user ? "/dashboard" : "/sign-in");
        }
    }

    return (
        <VerifyEmail
            status={params.resent === "1" ? "resent" : "pending"}
            email={email || undefined}
        />
    );
}
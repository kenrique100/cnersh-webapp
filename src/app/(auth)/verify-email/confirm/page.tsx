import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { confirmCnershVerification } from "@/app/actions/verification";
import VerifyEmail from "@/components/verify-email";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams: Promise<{ token?: string }>;
}

export default async function ConfirmVerifyEmailPage({
                                                         searchParams,
                                                     }: PageProps) {
    const { token } = await searchParams;
    if (!token) {
        redirect("/verify-email");
    }

    const result = await confirmCnershVerification(token);
    if (result.success) {
        const hdrs = await headers();
        const session = await auth.api.getSession({ headers: hdrs });
        if (session?.user) redirect("/dashboard");
        redirect(`/sign-in?verified=1&email=${encodeURIComponent(result.email)}`);
    }

    return (
        <VerifyEmail
            status={result.reason === "expired" ? "expired" : "invalid"}
        />
    );
}
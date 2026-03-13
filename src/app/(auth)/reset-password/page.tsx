import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { authIsNotRequired } from "@/lib/auth-utils";

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
    await authIsNotRequired();

    return (
        <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
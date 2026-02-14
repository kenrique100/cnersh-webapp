import { ResetPasswordForm } from "@/components/reset-password-form";
import { authIsNotRequired } from "@/lib/auth-utils";

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
    await authIsNotRequired();

    return <ResetPasswordForm />;
}
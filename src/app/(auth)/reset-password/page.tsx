import { ResetPasswordForm } from "@/components/reset-password-form";
import { authIsNotRequired } from "@/lib/auth-utils";

export default async function ResetPasswordPage() {
    await authIsNotRequired();

    return <ResetPasswordForm />;
}
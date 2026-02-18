import { RequestPasswordForm } from "@/components/request-password-form";
import { authIsNotRequired } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function RequestPasswordPage() {
    await authIsNotRequired();

    return <RequestPasswordForm />;
}
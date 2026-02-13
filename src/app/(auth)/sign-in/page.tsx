import { SignInForm } from "@/components/sign-in";
import { authIsNotRequired } from "@/lib/auth-utils";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In - CNEC",
    description: "Sign in to your CNEC account",
};

export default async function SignInPage() {
    await authIsNotRequired();

    return <SignInForm />;
}
import { SignInForm } from "@/components/sign-in";
import { authIsNotRequired } from "@/lib/auth-utils";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In - CNERSH",
    description: "Sign in to your CNERSH account",
};

export const dynamic = "force-dynamic";

export default async function SignInPage() {
    await authIsNotRequired();

    return <SignInForm />;
}
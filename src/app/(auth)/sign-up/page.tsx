import { SignUpForm } from "@/components/sign-up";
import { authIsNotRequired } from "@/lib/auth-utils";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign Up - CNEC",
    description: "Create a new CNEC account",
};

export default async function SignUpPage() {
    await authIsNotRequired();

    return <SignUpForm />;
}
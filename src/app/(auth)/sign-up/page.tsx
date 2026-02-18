import { SignUpForm } from "@/components/sign-up";
import { authIsNotRequired } from "@/lib/auth-utils";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign Up - CNERSH",
    description: "Create a new CNERSH account",
};

export default async function SignUpPage() {
    await authIsNotRequired();

    return <SignUpForm />;
}
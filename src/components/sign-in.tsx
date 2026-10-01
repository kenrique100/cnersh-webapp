"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";

import { authClient } from "@/lib/auth-client";
import { authEmailClientSchema } from "@/lib/email-validation-client";

const formSchema = z.object({
    email: authEmailClientSchema,
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "", rememberMe: false },
        mode: "onChange",
    });

    // Success banner after the user clicks their CNERSH verification link.
    useEffect(() => {
        if (searchParams.get("verified") === "1") {
            const email = searchParams.get("email");
            toast.success(
                email
                    ? `Email verified for ${email}. You can now sign in.`
                    : "Email verified. You can now sign in."
            );
        }
    }, [searchParams]);

    const onSubmit = async (data: FormValues) => {
        try {
            await authClient.signIn.email(
                {
                    email: data.email,
                    password: data.password,
                    rememberMe: data.rememberMe ?? false,
                },
                {
                    onSuccess: () => {
                        toast.success("Signed in successfully");
                        router.push("/dashboard");
                    },
                    onError: (ctx) => {
                        const msg = ctx.error?.message ?? "Sign in failed";
                        if (msg.toLowerCase().includes("verify")) {
                            toast.error(
                                "Please verify your email before signing in.",
                                {
                                    action: {
                                        label: "Resend email",
                                        onClick: () => {
                                            router.push(
                                                `/verify-email?email=${encodeURIComponent(
                                                    data.email
                                                )}`
                                            );
                                        },
                                    },
                                }
                            );
                        } else {
                            toast.error(msg);
                        }
                    },
                }
            );
        } catch (err) {
            console.error("Sign-in error:", err);
            toast.error("Unable to sign in. Please try again later.");
        }
    };

    const signInWithGoogle = async () => {
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/verify-email",
            });
        } catch {
            toast.error("Unable to sign in with Google. Please try again.");
        }
    };

    return (
        <Card className="w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-950">
            <CardHeader className="space-y-6 px-6 pt-10 pb-6 sm:px-8">
                <div className="flex flex-col items-center space-y-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-600 dark:bg-white">
                        <Image
                            src="/logo.png"
                            alt="CNERSH logo"
                            width={48}
                            height={48}
                            className="h-12 w-12"
                            priority
                        />
                    </div>
                    <div className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            Welcome back
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                            Sign in to your CNERSH account
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 pb-4 sm:px-8">
                <form
                    id="signin-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-6"
                >
                    <FieldGroup className="space-y-2">
                        <Field
                            data-invalid={!!form.formState.errors.email}
                            className="gap-1.5"
                        >
                            <FieldLabel className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Mail className="h-4 w-4 text-gray-500" />
                                Email Address <span className="text-red-500">*</span>
                            </FieldLabel>
                            <Input
                                {...form.register("email")}
                                type="email"
                                placeholder="name@agency.gov.cm"
                                autoComplete="email"
                                aria-invalid={!!form.formState.errors.email}
                                className="h-11 rounded-md border-gray-300 px-4 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                            />
                            {form.formState.errors.email && (
                                <FieldError
                                    errors={[form.formState.errors.email]}
                                    className="mt-1 text-xs text-red-600 dark:text-red-400"
                                />
                            )}
                        </Field>

                        <Field
                            data-invalid={!!form.formState.errors.password}
                            className="gap-1.5"
                        >
                            <FieldLabel className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Lock className="h-4 w-4 text-gray-500" />
                                Password <span className="text-red-500">*</span>
                            </FieldLabel>
                            <div className="relative">
                                <Input
                                    {...form.register("password")}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    aria-invalid={!!form.formState.errors.password}
                                    className="h-11 rounded-md border-gray-300 px-4 pr-12 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {form.formState.errors.password && (
                                <FieldError
                                    errors={[form.formState.errors.password]}
                                    className="mt-1 text-xs text-red-600 dark:text-red-400"
                                />
                            )}
                        </Field>

                        <div className="mt-2 flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <input
                                    type="checkbox"
                                    {...form.register("rememberMe")}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Remember me for 24 hours
                            </label>
                            <Link
                                href="/request-password"
                                className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
                            >
                                Forgot password?
                            </Link>
                        </div>
                    </FieldGroup>
                </form>
            </CardContent>

            <CardFooter className="flex w-full flex-col px-6 pb-4 pt-2">
                <div className="flex w-full flex-col gap-3">
                    <Button
                        type="submit"
                        form="signin-form"
                        disabled={form.formState.isSubmitting}
                        className="h-11 w-full rounded-md bg-blue-700 text-sm font-medium text-white transition-colors hover:bg-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                        {form.formState.isSubmitting ? (
                            <Spinner className="size-4" />
                        ) : (
                            "Sign in"
                        )}
                    </Button>

                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/sign-up"
                            className="font-medium text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400"
                        >
                            Create one
                        </Link>
                    </p>
                </div>

                <div className="relative my-6 w-full">
                    <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                            Or continue with
                        </span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={signInWithGoogle}
                    className="h-11 w-full rounded-md border-gray-300 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                >
                    <svg
                        className="mr-2 h-5 w-5"
                        viewBox="0 0 48 48"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.73 1.22 9.24 3.6l6.9-6.9C35.68 2.4 30.2 0 24 0 14.64 0 6.4 5.4 2.44 13.24l8.04 6.24C12.6 13.02 17.76 9.5 24 9.5z"
                        />
                        <path
                            fill="#4285F4"
                            d="M46.5 24.5c0-1.64-.14-3.2-.4-4.7H24v9h12.7c-.55 2.96-2.2 5.47-4.7 7.16l7.2 5.6C43.9 37.8 46.5 31.7 46.5 24.5z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M10.48 28.48A14.5 14.5 0 019.5 24c0-1.56.27-3.07.75-4.48l-8.04-6.24A23.96 23.96 0 000 24c0 3.8.9 7.4 2.48 10.72l8-6.24z"
                        />
                        <path
                            fill="#34A853"
                            d="M24 48c6.2 0 11.68-2.05 15.58-5.6l-7.2-5.6c-2 1.35-4.55 2.15-8.38 2.15-6.24 0-11.4-3.52-13.52-8.98l-8 6.24C6.4 42.6 14.64 48 24 48z"
                        />
                    </svg>
                    Continue with Google
                </Button>
            </CardFooter>

            <div className="border-t border-gray-200 px-6 pb-6 pt-4 dark:border-gray-800">
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                    &copy; 2026 CNERSH — Cameroon National Ethics Community. All
                    rights reserved.
                </p>
            </div>
        </Card>
    );
}
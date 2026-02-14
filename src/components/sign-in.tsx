"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

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
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Separator } from "./ui/separator";
import { Spinner } from "./ui/spinner";
import Image from "next/image";

// Email validation schema with comprehensive rules
const emailSchema = z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address (e.g., name@domain.com)");

const formSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
});

export function SignInForm() {
    const router = useRouter();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            await authClient.signIn.email(
                {
                    email: data.email,
                    password: data.password,
                    callbackURL: "/dashboard",
                },
                {
                    onSuccess: async () => {
                        // Fetch session to check 2FA status and user role
                        const session = await authClient.getSession();
                        const user = session?.data?.user;

                        if (!user) {
                            // Session fetch failed — fall back to default redirect
                            router.push("/dashboard");
                            toast.success("Signed in successfully");
                            return;
                        }

                        const role = user.role;
                        const twoFactorEnabled = user.twoFactorEnabled;

                        if (twoFactorEnabled) {
                            // 2FA is enabled — send OTP and redirect to verification page
                            const { error } = await authClient.twoFactor.sendOtp({});
                            if (error) {
                                toast.error(error.message || "Failed to send OTP");
                            } else {
                                router.push("/two-factor");
                                toast.success("OTP sent. Please check your email.");
                            }
                        } else {
                            // 2FA is disabled — redirect directly to dashboard
                            const redirectPath = (role === "admin" || role === "superadmin") ? "/admin" : "/dashboard";
                            router.push(redirectPath);
                            toast.success("Signed in successfully");
                        }
                    },
                    onError: (ctx) => {
                        // ✅ Better error handling
                        const errorMessage = ctx.error.message || "Invalid email or password";

                        if (errorMessage.includes("verify") || errorMessage.includes("verification")) {
                            toast.error("Please verify your email before signing in. Check your inbox.");
                        } else if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
                            toast.error("Access denied. Please check your credentials or verify your email.");
                        } else {
                            toast.error(errorMessage);
                        }
                    },
                }
            );
        } catch (error) {
            console.error("Sign-in error:", error);
            toast.error("An unexpected error occurred. Please try again.");
        } finally {
            form.reset();
        }
    };

    const signInWithGoogle = async () => {
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/",
            });
        } catch {
            toast.error("Unable to sign in with Google. Please try again.");
        }
    };

    return (
        <Card className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg rounded-2xl">
            <CardHeader className="space-y-6 px-6 sm:px-8 pt-10 pb-6">
            {/* Government-style Logo and Brand Section */}
                <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center w-full h-full">
                            <Image
                                src="/logo.png"
                                alt="Government Services"
                                width={100}
                                height={100}
                                className="w-15 h-15"
                                priority
                            />
                        </div>
                    </div>
                    <div className="text-center">
                        <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            Sign In
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Access your CNEC Account
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 sm:px-8 pb-4">
            <form
                    id="signin-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-6"
            >
                    <FieldGroup className="space-y-2">
                        <Controller
                            name="email"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                    <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Email Address <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        type="email"
                                        placeholder="name@agency.gov.cm"
                                        autoComplete="email"
                                        aria-invalid={fieldState.invalid}
                                        className="h-11 text-sm px-4 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                            className="text-xs text-red-600 dark:text-red-400 mt-1"
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="password"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                    <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                                        <span>Password <span className="text-red-500">*</span></span>
                                        <Link
                                            className="text-xs text-blue-700 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 transition-colors font-medium"
                                            href="/request-password-reset"
                                        >
                                            Forgot password?
                                        </Link>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        aria-invalid={fieldState.invalid}
                                        className="h-11 text-sm px-4 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                            className="text-xs text-red-600 dark:text-red-400 mt-1"
                                        />
                                    )}
                                </Field>
                            )}
                        />
                    </FieldGroup>
                </form>
            </CardContent>

            <CardFooter className="flex flex-col w-full px-6 pt-2 pb-6">
                <div className="flex flex-col w-full gap-3">
                    <Button
                        type="submit"
                        form="signin-form"
                        disabled={form.formState.isSubmitting}
                        className="w-full h-11 text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                        {form.formState.isSubmitting ? (
                            <Spinner className="size-4" />
                        ) : (
                            "Sign In"
                        )}
                    </Button>

                    <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                        Don&#39;t have an account?{" "}
                        <Link
                            href="/sign-up"
                            className="font-medium text-blue-700 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 transition-colors"
                        >
                            Create account
                        </Link>
                    </p>
                </div>

                <div className="relative my-6 w-full">
                    <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
                            Or continue with
                        </span>
                    </div>
                </div>

                <div className="flex flex-col w-full gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={signInWithGoogle}
                        className="w-full h-11 text-sm border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md transition-colors dark:border-gray-700 dark:hover:bg-gray-900 dark:text-gray-300"
                    >
                        <svg
                            className="w-5 h-5 mr-2"
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
                </div>
            </CardFooter>

            {/* FOOTER ADDED HERE - Copyright section */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    &copy; 2026 CNEC - Cameroon National Ethics Community. All rights reserved.
                </p>
            </div>
        </Card>
    );
}
"use client";

import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";
import Image from "next/image";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
    email: z.string().min(1, "Email address is required").email("Invalid email address"),
});

export function RequestPasswordForm() {
    const router = useRouter();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    });

    const [isEmailSent, setIsEmailSent] = useState(false);

    const onSubmit = async ({ email }: z.infer<typeof formSchema>) => {
        try {
            const { data, error } = await authClient.requestPasswordReset({
                email,
                redirectTo: "/reset-password",
            });

            if (data?.status) {
                toast.success("An email has been sent to you.");
                setIsEmailSent(true);
                router.refresh();
            }

            if (error) {
                toast.error(error.message);
                setIsEmailSent(false);
            }
        } catch {
            toast.error("Something went wrong");
        }
    };

    return (
        <Card className="w-full max-w-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg rounded-2xl mx-auto relative overflow-hidden">
            {/* Top Back Navigation */}
            <div className="absolute top-6 left-6">
                <Link
                    href="/sign-in"
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back
                </Link>
            </div>

            {isEmailSent ? (
                <>
                    <CardHeader className="space-y-6 px-6 sm:px-8 pt-20 pb-2">
                        <div className="flex flex-col items-center space-y-6">
                            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 shadow-sm">
                                <Mail className="w-10 h-10 text-blue-700 dark:text-blue-500" />
                            </div>
                            <div className="text-center">
                                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                    Check your mail
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2 px-4">
                                    We have sent a password recover instructions to your email.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 sm:px-8 pb-10 pt-4 flex flex-col items-center gap-4">
                        <Button
                            onClick={() => window.open('mailto:', '_blank')}
                            className="w-full h-11 text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md transition-colors"
                        >
                            Open email app
                        </Button>
                        <button
                            onClick={() => router.push("/sign-in")}
                            className="text-sm text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                        >
                            Skip, I&apos;ll confirm later
                        </button>
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6 px-4">
                            Did not receive the email? Check your spam filter, or{" "}
                            <button onClick={() => setIsEmailSent(false)} className="text-blue-700 dark:text-blue-500 hover:underline">
                                try another email address
                            </button>
                        </p>
                    </CardContent>
                </>
            ) : (
                <>
                    <CardHeader className="space-y-6 px-6 sm:px-8 pt-20 pb-6">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white dark:bg-white border border-gray-200 dark:border-gray-600 shadow-sm">
                                <Image
                                    src="/logo.png"
                                    alt="CNERSH Logo"
                                    width={100}
                                    height={100}
                                    className="w-15 h-15 object-contain"
                                    priority
                                />
                            </div>
                            <div className="text-center">
                                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                    Reset password
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    Enter the email associated with your account and we&apos;ll send an email with instructions to reset your password.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 sm:px-8 pb-10">
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="flex flex-col gap-6"
                            id="reset-password"
                        >
                            <FieldGroup>
                                <Controller
                                    name="email"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Email address <span className="text-red-500">*</span>
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                autoComplete="email"
                                                type="email"
                                                placeholder="name@agency.gov.cm"
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

                            <Button
                                type="submit"
                                className="w-full h-11 text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                disabled={form.formState.isSubmitting}
                                form="reset-password"
                            >
                                {form.formState.isSubmitting ? (
                                    <Spinner className="size-5" />
                                ) : (
                                    "Send Instructions"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </>
            )}
        </Card>
    );
}
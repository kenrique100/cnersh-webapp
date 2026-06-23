"use client";

import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";
import { useState } from "react";
import { EyeIcon, EyeOffIcon, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const formSchema = z
    .object({
        newPassword: z.string().min(10, "Password must be at least 10 characters"),
        confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords do not match",
        path: ["confirmNewPassword"],
    });

export function ResetPasswordForm() {
    const router = useRouter();
    const params = useSearchParams();
    const token = params.get("token");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            newPassword: "",
            confirmNewPassword: "",
        },
    });

    const onSubmit = async ({ newPassword }: z.infer<typeof formSchema>) => {
        try {
            await authClient.resetPassword(
                { newPassword, token: token as string },
                {
                    onSuccess: async () => {
                        toast.success("Password reset successfully.");
                        router.push("/sign-in");
                    },
                    onError: (ctx) => {
                        toast.error(ctx.error.message);
                    },
                }
            );
        } catch {
            toast.error("Something went wrong");
        }
    };

    return (
        <Card className="w-full max-w-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg rounded-2xl mx-auto relative overflow-hidden">
            <div className="absolute top-6 left-6">
                <Link
                    href="/sign-in"
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back
                </Link>
            </div>

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
                            Create new password
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Your new password must be different from previous used passwords.
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
                    <FieldGroup className="space-y-4">
                        <Controller
                            name="newPassword"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                    <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Password <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <div className="relative">
                                        <Input
                                            {...field}
                                            autoComplete="new-password"
                                            placeholder="Enter new password"
                                            type={showNewPassword ? "text" : "password"}
                                            aria-invalid={fieldState.invalid}
                                            className="h-11 text-sm px-4 pr-10 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900 w-full"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        >
                                            {showNewPassword ? (
                                                <EyeOffIcon className="h-4 w-4" />
                                            ) : (
                                                <EyeIcon className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Must be at least 10 characters.
                                    </p>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} className="text-xs text-red-600 dark:text-red-400 mt-1" />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="confirmNewPassword"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                    <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Confirm Password <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <div className="relative">
                                        <Input
                                            {...field}
                                            autoComplete="new-password"
                                            placeholder="Confirm your password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            aria-invalid={fieldState.invalid}
                                            className="h-11 text-sm px-4 pr-10 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900 w-full"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOffIcon className="h-4 w-4" />
                                            ) : (
                                                <EyeIcon className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Both passwords must match.
                                    </p>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} className="text-xs text-red-600 dark:text-red-400 mt-1" />
                                    )}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <Button
                        type="submit"
                        className="w-full h-11 text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mt-2"
                        disabled={form.formState.isSubmitting}
                        form="reset-password"
                    >
                        {form.formState.isSubmitting ? (
                            <Spinner className="size-5" />
                        ) : (
                            "Reset Password"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
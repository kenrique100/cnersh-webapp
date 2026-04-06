"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Spinner } from "./ui/spinner";
import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const formSchema = z
    .object({
        newPassword: z.string().min(10, "Password must be at least 10 characters"),
        currentPassword: z.string().min(1, "Enter your current password"),
        confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords do not match",
        path: ["confirmNewPassword"],
    });

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (!password) return { score: 0, label: "Too weak", color: "bg-gray-300" };
    
    // Length check
    if (password.length >= 10) score += 25;
    if (password.length >= 12) score += 15;
    
    // Complexity checks
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;
    
    let label = "Too weak";
    let color = "bg-red-500";
    
    if (score >= 75) {
        label = "Strong";
        color = "bg-green-500";
    } else if (score >= 50) {
        label = "Good";
        color = "bg-yellow-500";
    } else if (score >= 25) {
        label = "Fair";
        color = "bg-orange-500";
    }
    
    return { score, label, color };
};

export function ChangePasswordForm() {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "Too weak", color: "bg-gray-300" });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            newPassword: "",
            confirmNewPassword: "",
            currentPassword: "",
        },
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            await authClient.changePassword(
                {
                    newPassword: data.newPassword,
                    currentPassword: data.currentPassword,
                },
                {
                    onSuccess: async () => {
                        toast.success("Your password has been changed successfully");
                        form.reset();
                        setPasswordStrength({ score: 0, label: "Too weak", color: "bg-gray-300" });
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
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            id="change-password"
        >
            <FieldGroup className="space-y-4">
                <Controller
                    name="currentPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Current Password <span className="text-red-500">*</span>
                            </FieldLabel>
                            <div className="relative">
                                <Input
                                    {...field}
                                    type={showCurrentPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="Enter current password"
                                    aria-invalid={fieldState.invalid}
                                    className="h-11 text-sm px-4 pr-10 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    {showCurrentPassword ? (
                                        <EyeOffIcon className="h-4 w-4" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
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
                    name="newPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                New Password <span className="text-red-500">*</span>
                            </FieldLabel>
                            <div className="relative">
                                <Input
                                    {...field}
                                    type={showNewPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="Enter new password"
                                    aria-invalid={fieldState.invalid}
                                    className="h-11 text-sm px-4 pr-10 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                                    onChange={(e) => {
                                        field.onChange(e);
                                        setPasswordStrength(calculatePasswordStrength(e.target.value));
                                    }}
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
                            {field.value && (
                                <div className="space-y-2 mt-2">
                                    <div className="flex items-center gap-2">
                                        <Progress value={passwordStrength.score} className="h-2" />
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[60px]">
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Use 10+ characters with uppercase, lowercase, numbers, and symbols
                                    </p>
                                </div>
                            )}
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
                    name="confirmNewPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Confirm New Password <span className="text-red-500">*</span>
                            </FieldLabel>
                            <div className="relative">
                                <Input
                                    {...field}
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="Confirm new password"
                                    aria-invalid={fieldState.invalid}
                                    className="h-11 text-sm px-4 pr-10 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
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
                disabled={form.formState.isSubmitting}
                className="w-full h-11 text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700 mt-2"
            >
                {form.formState.isSubmitting ? (
                    <Spinner className="size-4" />
                ) : (
                    "Change Password"
                )}
            </Button>
        </form>
    );
}
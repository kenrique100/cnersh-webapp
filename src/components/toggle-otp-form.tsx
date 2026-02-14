"use client";

import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Spinner } from "./ui/spinner";
import { Switch } from "./ui/switch";
import { ShieldCheckIcon, ShieldOffIcon, EyeIcon, EyeOffIcon } from "lucide-react";

interface ToggleOtpProps {
    twoFactorEnabled: boolean;
}

const formSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export function ToggleOtpForm({ twoFactorEnabled }: ToggleOtpProps) {
    const router = useRouter();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: "",
        },
    });

    const [isOpen, setIsOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = () => {
        setIsOpen(true);
        form.reset();
    };

    const onSubmit = async ({ password }: z.infer<typeof formSchema>) => {
        try {
            if (twoFactorEnabled) {
                const { error } = await authClient.twoFactor.disable({ password });

                if (error) {
                    toast.error(error.message);
                    return;
                }

                toast.success("Two-factor authentication disabled");
                router.refresh();
            } else {
                const { error } = await authClient.twoFactor.enable({ password });

                if (error) {
                    toast.error(error.message);
                    return;
                }

                toast.success("Two-factor authentication enabled");
                router.refresh();
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsOpen(false);
            setShowPassword(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3 flex-1">
                    {twoFactorEnabled ? (
                        <ShieldCheckIcon className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                        <ShieldOffIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-1">
                            Two-Factor Authentication (2FA)
                        </Label>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            {twoFactorEnabled
                                ? "Your account is protected with 2FA. You'll receive a code via email when signing in."
                                : "Add an extra layer of security by requiring a verification code when signing in."}
                        </p>
                    </div>
                </div>
                <Switch 
                    checked={twoFactorEnabled} 
                    onCheckedChange={handleChange}
                    className="flex-shrink-0 ml-4"
                />
            </div>

            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                    form.reset();
                    setShowPassword(false);
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {!twoFactorEnabled
                                ? "Enable Two-Factor Authentication"
                                : "Disable Two-Factor Authentication"}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            {!twoFactorEnabled
                                ? "Confirm your password to enable 2FA. You'll receive a verification code via email when signing in."
                                : "Confirm your password to disable 2FA. Your account will be less secure without this protection."}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex flex-col gap-6 mt-4"
                        id="toggle-otp-form"
                    >
                        <FieldGroup>
                            <Controller
                                name="password"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                        <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Current Password <span className="text-red-500">*</span>
                                        </FieldLabel>
                                        <div className="relative">
                                            <Input
                                                {...field}
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="current-password"
                                                placeholder="Enter your password"
                                                aria-invalid={fieldState.invalid}
                                                className="h-11 text-sm px-4 pr-10 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            >
                                                {showPassword ? (
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

                        <div className="flex gap-3 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsOpen(false);
                                    form.reset();
                                    setShowPassword(false);
                                }}
                                className="h-10 px-4 text-sm font-medium"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                                className={`h-10 px-4 text-sm font-medium ${
                                    twoFactorEnabled
                                        ? "bg-red-600 hover:bg-red-700 text-white"
                                        : "bg-blue-700 hover:bg-blue-800 text-white"
                                }`}
                                form="toggle-otp-form"
                            >
                                {form.formState.isSubmitting ? (
                                    <Spinner className="size-4" />
                                ) : !twoFactorEnabled ? (
                                    "Enable 2FA"
                                ) : (
                                    "Disable 2FA"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
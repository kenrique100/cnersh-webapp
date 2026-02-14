"use client";

import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Spinner } from "./ui/spinner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { useState, useEffect } from "react";
import { ShieldCheckIcon } from "lucide-react";

const formSchema = z.object({
    code: z.string().length(6, "Code must be exactly 6 digits"),
});

export function OtpCodeForm() {
    const router = useRouter();
    const [resendCountdown, setResendCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: "",
        },
    });

    // Countdown timer for resend
    useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => {
                setResendCountdown(resendCountdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [resendCountdown]);

    const handleResend = async () => {
        setIsResending(true);
        try {
            const { error } = await authClient.twoFactor.sendOtp({});
            
            if (error) {
                toast.error(error.message || "Failed to resend OTP");
            } else {
                toast.success("A new OTP code has been sent to your email");
                setResendCountdown(60);
                setCanResend(false);
                form.reset();
            }
        } catch {
            toast.error("Unable to resend OTP. Please try again.");
        } finally {
            setIsResending(false);
        }
    };

    const onSubmit = async ({ code }: z.infer<typeof formSchema>) => {
        try {
            await authClient.twoFactor.verifyOtp(
                { code },
                {
                    onSuccess: async () => {
                        toast.success("Verification successful");
                        router.push("/dashboard");
                    },
                    onError: (ctx) => {
                        toast.error(ctx.error.message || "Invalid verification code");
                    },
                }
            );
        } catch {
            toast.error("Something went wrong. Please try again.");
        }
    };

    return (
        <Card className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg rounded-2xl">
            <CardHeader className="space-y-6 px-6 sm:px-8 pt-10 pb-6">
                {/* Government-style Logo and Brand Section */}
                <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                        <ShieldCheckIcon className="w-10 h-10 text-blue-700 dark:text-blue-500" />
                    </div>
                    <div className="text-center">
                        <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            Two-Factor Authentication
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Enter the 6-digit verification code sent to your email
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 sm:px-8 pb-4">
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-6"
                    id="otp-code"
                >
                    <FieldGroup>
                        <Controller
                            name="code"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-2">
                                    <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                                        Verification Code <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <div className="flex justify-center">
                                        <InputOTP
                                            maxLength={6}
                                            value={field.value}
                                            onChange={field.onChange}
                                            className="gap-2"
                                        >
                                            <InputOTPGroup>
                                                <InputOTPSlot index={0} className="w-12 h-12 text-lg border-gray-300 dark:border-gray-600" />
                                                <InputOTPSlot index={1} className="w-12 h-12 text-lg border-gray-300 dark:border-gray-600" />
                                                <InputOTPSlot index={2} className="w-12 h-12 text-lg border-gray-300 dark:border-gray-600" />
                                                <InputOTPSlot index={3} className="w-12 h-12 text-lg border-gray-300 dark:border-gray-600" />
                                                <InputOTPSlot index={4} className="w-12 h-12 text-lg border-gray-300 dark:border-gray-600" />
                                                <InputOTPSlot index={5} className="w-12 h-12 text-lg border-gray-300 dark:border-gray-600" />
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                    {fieldState.invalid && (
                                        <FieldError 
                                            errors={[fieldState.error]} 
                                            className="text-xs text-red-600 dark:text-red-400 mt-1 text-center"
                                        />
                                    )}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    {/* Security Notice */}
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs text-blue-700 dark:text-blue-400 text-center">
                            For your security, this code will expire in 10 minutes. Do not share it with anyone.
                        </p>
                    </div>
                </form>
            </CardContent>

            <CardFooter className="flex flex-col w-full px-6 pt-2 pb-6 gap-4">
                <Button
                    type="submit"
                    form="otp-code"
                    disabled={form.formState.isSubmitting || form.watch("code").length !== 6}
                    className="w-full h-11 text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                    {form.formState.isSubmitting ? (
                        <Spinner className="size-4" />
                    ) : (
                        "Verify Code"
                    )}
                </Button>

                {/* Resend Code Section */}
                <div className="text-center">
                    {canResend ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleResend}
                            disabled={isResending}
                            className="text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400"
                        >
                            {isResending ? (
                                <Spinner className="size-4 mr-2" />
                            ) : null}
                            Resend verification code
                        </Button>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Didn&#39;t receive the code? Resend in{" "}
                            <span className="font-medium text-blue-700 dark:text-blue-500">
                                {resendCountdown}s
                            </span>
                        </p>
                    )}
                </div>
            </CardFooter>

            {/* Footer - Copyright section */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    &copy; 2026 CNEC - Cameroon National Ethics Community. All rights reserved.
                </p>
            </div>
        </Card>
    );
}
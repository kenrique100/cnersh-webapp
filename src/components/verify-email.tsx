"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { resendCnershVerification } from "@/app/actions/verification";

type Status = "pending" | "resent" | "expired" | "invalid" | "verified";

interface Props {
    status: Status;
    email?: string;
}

const COOLDOWN_SECONDS = 60;

export default function VerifyEmail({ status, email }: Props) {
    const [currentEmail, setCurrentEmail] = React.useState(email ?? "");
    const [isSending, setIsSending] = React.useState(false);
    const [cooldown, setCooldown] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);

    // Tick the cooldown down once per second.
    React.useEffect(() => {
        if (cooldown <= 0) return;
        const id = setInterval(() => {
            setCooldown((s) => (s <= 1 ? 0 : s - 1));
        }, 1000);
        return () => clearInterval(id);
    }, [cooldown]);

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (isSending || cooldown > 0) return;
        setIsSending(true);
        try {
            const result = await resendCnershVerification(currentEmail);
            if (!result.success) {
                setError(result.error);
                if (result.cooldownSeconds) setCooldown(result.cooldownSeconds);
                return;
            }
            toast.success("Verification email sent. Please check your inbox.");
            setCooldown(result.cooldownSeconds ?? COOLDOWN_SECONDS);
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : "Failed to send email.";
            setError(msg);
        } finally {
            setIsSending(false);
        }
    };

    const heading =
        status === "expired"
            ? "Verification link expired"
            : status === "invalid"
                ? "Verification link is not valid"
                : status === "resent"
                    ? "Verification email sent"
                    : "Check your email";

    const body =
        status === "expired"
            ? "That link has expired. Request a new one below."
            : status === "invalid"
                ? "This link is malformed or has already been used. Request a new one below."
                : status === "resent"
                    ? `We sent a new verification link${currentEmail ? ` to ${currentEmail}` : ""}.`
                    : `We sent a verification link${currentEmail ? ` to ${currentEmail}` : ""}. Click the link in the email to continue.`;

    return (
        <Card className="mx-auto w-full max-w-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
            <CardHeader className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
                    {status === "pending" || status === "resent" ? (
                        <Mail className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                    ) : (
                        <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    )}
                </div>
                <CardTitle className="text-xl font-semibold">{heading}</CardTitle>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {body}
                </p>
            </CardHeader>
            <CardContent className="space-y-5">
                {status !== "verified" && (
                    <form onSubmit={handleResend} className="space-y-3">
                        <label
                            htmlFor="verify-email-input"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Email address
                        </label>
                        <Input
                            id="verify-email-input"
                            type="email"
                            autoComplete="email"
                            value={currentEmail}
                            onChange={(e) => setCurrentEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            disabled={isSending}
                        />

                        {error && (
                            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isSending || cooldown > 0}
                            className="w-full bg-blue-700 text-white hover:bg-blue-800"
                        >
                            {isSending ? (
                                <>
                                    <Spinner className="mr-2 size-4" />
                                    Sending…
                                </>
                            ) : cooldown > 0 ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Resend in {cooldown}s
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Resend verification email
                                </>
                            )}
                        </Button>
                    </form>
                )}

                {status === "resent" && (
                    <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            Check your inbox and spam folder. The link expires in
                            one hour.
                        </span>
                    </div>
                )}

                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Already verified?{" "}
                    <Link
                        href="/sign-in"
                        className="font-medium text-blue-700 hover:underline dark:text-blue-300"
                    >
                        Sign in
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
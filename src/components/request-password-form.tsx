"use client";

import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";

const formSchema = z.object({
    email: z.email("Invalid email"),
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
        <>
            {isEmailSent ? (
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Check your email</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex w-full p-6">
                            A password reset link has been sent to your email.
                        </div>
                        <Button
                            onClick={() => router.push("/sign-in")}
                            className="cursor-pointer"
                        >
                            Back to sign in
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Enter your email</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                                        <Field data-invalid={fieldState.invalid} className="gap-1">
                                            <FieldLabel>Email</FieldLabel>
                                            <Input
                                                {...field}
                                                autoComplete="off"
                                                type="email"
                                                aria-invalid={fieldState.invalid}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>

                            <Button
                                type="submit"
                                className="cursor-pointer max-w-40 self-end"
                                disabled={form.formState.isSubmitting}
                                form="reset-password"
                            >
                                {form.formState.isSubmitting ? (
                                    <Spinner className="size-6" />
                                ) : (
                                    "Send request"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const formSchema = z
    .object({
        newPassword: z.string().min(6, "Enter a valid password"),
        currentPassword: z.string().min(6, "Enter a valid password"),
        confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords do not match",
        path: ["confirmNewPassword"],
    });

export function ChangePasswordForm() {
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
                    },
                    onError: (ctx) => {
                        toast.error(ctx.error.message);
                    },
                }
            );
        } catch {
            throw new Error("Something went wrong");
        }
    };

    return (
        <Card className="w-full max-w-md border-0 shadow-none">
            <CardHeader>
                <CardTitle>Update your password</CardTitle>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-4"
                    id="change-password"
                >
                    <FieldGroup>
                        <Controller
                            name="currentPassword"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-1">
                                    <FieldLabel>Current password</FieldLabel>
                                    <Input
                                        {...field}
                                        type="password"
                                        autoComplete="off"
                                        aria-invalid={fieldState.invalid}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />
                        <Controller
                            name="newPassword"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-1">
                                    <FieldLabel>New password</FieldLabel>
                                    <Input
                                        {...field}
                                        autoComplete="off"
                                        type="password"
                                        aria-invalid={fieldState.invalid}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="confirmNewPassword"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-1">
                                    <FieldLabel>Confirm new password</FieldLabel>
                                    <Input
                                        {...field}
                                        autoComplete="off"
                                        aria-invalid={fieldState.invalid}
                                        type="password"
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
                        id="change-password"
                    >
                        {form.formState.isSubmitting ? (
                            <Spinner className="size-6" />
                        ) : (
                            "Change password"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
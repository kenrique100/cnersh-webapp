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

interface ToggleOtpProps {
    twoFactorEnabled: boolean;
}

const formSchema = z.object({
    password: z.string().min(6, "Invalid password"),
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

    const handleChange = () => {
        setIsOpen(true);
    };

    const onSubmit = async ({ password }: z.infer<typeof formSchema>) => {
        try {
            if (twoFactorEnabled) {
                const { error } = await authClient.twoFactor.disable({ password });

                if (error) {
                    toast.error(error.message);
                    return;
                }

                toast.success("Two factor authentication disabled");
                router.refresh();
            } else {
                const { error } = await authClient.twoFactor.enable({ password });

                if (error) {
                    toast.error(error.message);
                    return;
                }

                toast.success("Two factor authentication enabled");
                router.refresh();
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsOpen(false);
        }
    };

    return (
        <Card className="w-full max-w-md border-0 shadow-none">
            <CardHeader>
                <CardTitle>Enable/Disable Two Factor Auth</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center">
                    <Label>
                        {!twoFactorEnabled
                            ? "Enable two factor authentication"
                            : "Disable two factor authentication"}
                    </Label>
                    <Switch checked={twoFactorEnabled} onCheckedChange={handleChange} />
                </div>

                <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {!twoFactorEnabled
                                    ? "Enable two factor authentication"
                                    : "Disable two factor authentication"}
                            </DialogTitle>
                            <DialogDescription>
                                Please confirm your password to{" "}
                                {!twoFactorEnabled ? "enable" : "disable"} 2FA in your account.
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="flex flex-col gap-6"
                            id="toggle-otp-form"
                        >
                            <FieldGroup>
                                <Controller
                                    name="password"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} className="gap-1">
                                            <FieldLabel>Password</FieldLabel>
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
                                form="toggle-otp-form"
                            >
                                {form.formState.isSubmitting ? (
                                    <Spinner className="size-6" />
                                ) : !twoFactorEnabled ? (
                                    "Enable 2FA"
                                ) : (
                                    "Disable 2FA"
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
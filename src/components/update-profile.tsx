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
import ImageUpload from "./image-upload";
import { Spinner } from "./ui/spinner";

interface ProfileFormProps {
    email: string;
    name: string;
    image: string;
}

const formSchema = z.object({
    email: z.string().email("Enter a valid email"),
    name: z.string().min(3, "Name must be at least 3 characters"),
    image: z.string().optional(),
});

export function UpdateProfile({ name, email, image}: ProfileFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name,
            email,
            image: image || "",
        },
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            await authClient.updateUser(
                {
                    name: data.name,
                    image: data.image || "",
                },
                {
                    onSuccess: async () => {
                        toast.success("Profile updated successfully");
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
            className="flex flex-col gap-6"
            id="update-profile"
        >
            <FieldGroup className="space-y-4">
                <Controller
                    name="image"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-2">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Profile Picture
                            </FieldLabel>
                            <ImageUpload
                                defaultUrl={field.value ?? null}
                                onChange={(url) => {
                                    field.onChange(url);
                                }}
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
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Full Name <span className="text-red-500">*</span>
                            </FieldLabel>
                            <Input
                                {...field}
                                autoComplete="name"
                                placeholder="Enter your full name"
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
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email Address
                            </FieldLabel>
                            <Input
                                {...field}
                                type="email"
                                autoComplete="email"
                                placeholder="name@agency.gov.cm"
                                aria-invalid={fieldState.invalid}
                                disabled
                                className="h-11 text-sm px-4 rounded-md border-gray-300 bg-gray-50 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Email address cannot be changed
                            </p>
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
                className="w-full h-11 text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700"
                form="update-profile"
            >
                {form.formState.isSubmitting ? (
                    <Spinner className="size-4" />
                ) : (
                    "Update Profile"
                )}
            </Button>
        </form>
    );
}
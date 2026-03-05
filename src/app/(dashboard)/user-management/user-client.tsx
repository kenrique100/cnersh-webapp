// user-client.tsx (updated)
"use client";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { UserProps, useUsers } from "@/hooks/use-user";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {useEffect, useState} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { columns } from "./columns";

const ROLE_OPTIONS = ["user", "admin", "superadmin"] as const;
export type Role = (typeof ROLE_OPTIONS)[number];

function getAllowedRoles(currentRole: string): readonly Role[] {
    if (currentRole === "superadmin") return ROLE_OPTIONS;
    return ["user"] as const;
}

const formSchema = z.object({
    name: z.string().min(3, "Name is required"),
    email: z.string().email("Email is required"),
    role: z.enum(ROLE_OPTIONS, "Role is required"),
    password: z.string().min(6, "Password is required").optional(),
});

export default function UserManagementForm({ users, currentRole }: { users: UserProps[]; currentRole: string }) {
    const router = useRouter();
    const allowedRoles = getAllowedRoles(currentRole);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            role: undefined,
        },
    });

    const { isOpen, setIsOpen, user, setUser } = useUsers();

    useEffect(() => {
        if (user) {
            form.setValue("name", user.name);
            form.setValue("email", user.email);

            const role = ROLE_OPTIONS.find((r) => r === user.role);

            if (role) {
                form.setValue("role", role);
            } else {
                form.setValue("role", "user");
            }
        }
    }, [user, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (!user.id) {
                if (!values.password) {
                    toast.error("Password is required for new user");
                    return;
                }

                await authClient.admin.createUser({
                    name: values.name,
                    email: values.email,
                    password: values.password,
                    role: values.role as Role,
                });

                toast.success("New user created successfully");
            } else {
                await authClient.admin.updateUser({
                    userId: user.id,
                    data: {
                        name: values.name,
                        email: values.email,
                        role: values.role as Role,
                    },
                });

                toast.success("User updated successfully");
            }

            setIsOpen(false);
            form.reset();
            setUser({
                id: "",
                name: "",
                role: "",
                email: "",
                emailVerified: false,
                hasDeletePermission: false,
            });

            router.refresh();
        } catch {
            toast.error("Something went wrong");
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="w-[95%] sm:w-full max-w-md rounded-lg mx-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">
                            {!!user.id ? "Edit user" : "Create user"}
                        </DialogTitle>
                    </DialogHeader>

                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        id="user-management"
                        className="flex flex-col items-end justify-center"
                    >
                        <FieldGroup className="w-full space-y-4">
                            <Controller
                                name="name"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} className="gap-1">
                                        <FieldLabel className="text-sm">Name</FieldLabel>
                                        <Input
                                            {...field}
                                            autoComplete="off"
                                            aria-invalid={fieldState.invalid}
                                            className="h-9 sm:h-10 text-sm"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="email"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} className="gap-1">
                                        <FieldLabel className="text-sm">Email</FieldLabel>
                                        <Input
                                            {...field}
                                            autoComplete="off"
                                            aria-invalid={fieldState.invalid}
                                            className="h-9 sm:h-10 text-sm"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            {!user.id ? (
                                <Controller
                                    name="password"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} className="gap-1">
                                            <FieldLabel className="text-sm">Password</FieldLabel>
                                            <Input
                                                {...field}
                                                autoComplete="off"
                                                aria-invalid={fieldState.invalid}
                                                type="password"
                                                className="h-9 sm:h-10 text-sm"
                                            />
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                            ) : null}

                            <Controller
                                name="role"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} className="gap-1">
                                        <FieldLabel className="text-sm">Role</FieldLabel>
                                        <Select
                                            {...field}
                                            onValueChange={field.onChange}
                                            defaultValue={user.role}
                                        >
                                            <SelectTrigger className="w-full h-9 sm:h-10 text-sm">
                                                <SelectValue placeholder="Role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allowedRoles.map((role) => (
                                                    <SelectItem key={role} value={role} className="text-sm">
                                                        {role}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <Button
                            type="submit"
                            className="cursor-pointer w-full sm:w-auto sm:self-end mt-6 h-9 sm:h-10 text-sm"
                            disabled={form.formState.isSubmitting}
                            form="user-management"
                        >
                            {form.formState.isSubmitting ? (
                                <Spinner className="size-5" />
                            ) : (
                                "Save changes"
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="flex flex-col px-2 sm:px-8 py-4 sm:py-6 w-full">
                <div className="flex flex-col sm:flex-row w-full justify-between gap-3 sm:items-center">
                    <h1 className="text-lg font-semibold">User management</h1>
                    <Button
                        className="cursor-pointer w-full sm:w-auto h-9 sm:h-10 text-sm"
                        onClick={() => setIsOpen(true)}
                    >
                        Create new user
                    </Button>
                </div>

                <div className="flex flex-col py-4 sm:py-6 w-full overflow-x-auto">
                    {/* Mobile: Horizontal scroll with min-width */}
                    <div className="min-w-160 sm:min-w-0">
                        <DataTable data={users} columns={columns} />
                    </div>
                </div>
            </div>
        </>
    );
}
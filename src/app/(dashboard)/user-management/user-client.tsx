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
import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { columns } from "./columns";
import { MobileUserCard } from "./MobileUserCard";
import Link from "next/link";
import {
    UserPlus,
    ShieldAlert,
    ClipboardCheck,
    Users,
    Activity,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    ScrollText,
    Database,
    Shield,
    Wifi,
} from "lucide-react";

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
    password: z.string().min(10, "Password must be at least 10 characters").optional(),
});

interface ManagementData {
    stats: {
        totalUsers: number;
        activeUsers: number;
        bannedUsers: number;
        newRegistrations: number;
        weeklyNewUsers: number;
    };
    recentActivity: {
        id: string;
        action: string;
        details: string | null;
        targetId: string | null;
        adminName: string | null;
        createdAt: string;
    }[];
}

interface UserManagementClientProps {
    users: UserProps[];
    currentRole: string;
    managementData: ManagementData | null;
}

// Helper to format time ago
function timeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// Format action name for display
function formatAction(action: string) {
    return action
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function UserManagementClient({ users, currentRole, managementData }: UserManagementClientProps) {
    const router = useRouter();
    const allowedRoles = getAllowedRoles(currentRole);

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

    const stats = managementData?.stats;
    const recentActivity = managementData?.recentActivity ?? [];

    // Stat cards config
    const statCards = [
        {
            title: "New Registrations",
            value: stats?.newRegistrations ?? 0,
            subtitle: `${stats?.weeklyNewUsers ?? 0} this week`,
            icon: UserPlus,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/40",
            borderColor: "border-blue-100 dark:border-blue-900/50",
            link: "#users-table",
            linkText: "View All",
        },
        {
            title: "Flagged / Suspended",
            value: stats?.bannedUsers ?? 0,
            subtitle: stats?.bannedUsers
                ? `${((stats.bannedUsers / Math.max(stats.totalUsers, 1)) * 100).toFixed(1)}% of users`
                : "No flagged users",
            icon: ShieldAlert,
            color: "text-orange-600 dark:text-orange-400",
            bg: "bg-orange-50 dark:bg-orange-950/40",
            borderColor: "border-orange-100 dark:border-orange-900/50",
            link: "#users-table",
            linkText: "Review Users",
        },
        {
            title: "Pending Approvals",
            value: users.filter((u) => !u.emailVerified).length,
            subtitle: "Unverified accounts",
            icon: ClipboardCheck,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950/40",
            borderColor: "border-amber-100 dark:border-amber-900/50",
            link: "#users-table",
            linkText: "Manage Accounts",
        },
        {
            title: "Total Active Users",
            value: stats?.activeUsers ?? 0,
            subtitle: `${stats?.totalUsers ?? 0} total registered`,
            icon: Users,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-950/40",
            borderColor: "border-green-100 dark:border-green-900/50",
            link: "#users-table",
            linkText: "View All",
        },
    ];

    return (
        <>
            {/* Create/Edit User Dialog */}
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
                                                placeholder="Min. 10 characters"
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

            <div className="flex flex-col w-full space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row w-full justify-between gap-3 sm:items-center">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and monitor user accounts</p>
                    </div>
                    <Button
                        className="cursor-pointer w-full sm:w-auto h-9 sm:h-10 text-sm"
                        onClick={() => setIsOpen(true)}
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create New User
                    </Button>
                </div>

                {/* Overview Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={card.title}
                                className={`relative rounded-xl border ${card.borderColor} ${card.bg} p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            {card.title}
                                        </p>
                                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                            {card.value}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                            {card.subtitle}
                                        </p>
                                    </div>
                                    <div className={`p-2 sm:p-2.5 rounded-lg ${card.bg}`}>
                                        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
                                    </div>
                                </div>
                                <a
                                    href={card.link}
                                    className={`inline-flex items-center gap-1 text-xs font-medium mt-3 ${card.color} hover:underline`}
                                >
                                    {card.linkText}
                                    <ArrowRight className="h-3 w-3" />
                                </a>
                            </div>
                        );
                    })}
                </div>

                {/* Activity & System Health Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Recent Administrative Activity */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Recent Administrative Activity</h2>
                            </div>
                            <Link
                                href="/admin/audit-logs"
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline hidden sm:inline-flex items-center gap-1"
                            >
                                View All <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[320px] overflow-y-auto">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((log) => (
                                    <div key={log.id} className="flex items-start gap-3 px-4 sm:px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="mt-0.5">
                                            <ActionIcon action={log.action} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                                <span className="font-medium">{formatAction(log.action)}</span>
                                            </p>
                                            {log.details && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                    {log.details}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    by {log.adminName ?? "System"}
                                                </span>
                                                <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    {timeAgo(log.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                                    No recent administrative activity
                                </div>
                            )}
                        </div>
                        <div className="px-4 sm:px-5 py-2 border-t border-gray-100 dark:border-gray-800 sm:hidden">
                            <Link
                                href="/admin/audit-logs"
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                                View All Logs <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                    </div>

                    {/* System / User Health */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                            <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">System / User Health</h2>
                        </div>
                        <div className="p-4 sm:p-5 space-y-4">
                            <HealthIndicator
                                label="Authentication Service"
                                status="operational"
                                icon={<Shield className="h-4 w-4" />}
                            />
                            <HealthIndicator
                                label="Database Connection"
                                status="operational"
                                icon={<Database className="h-4 w-4" />}
                            />
                            <HealthIndicator
                                label="API Status"
                                status="operational"
                                icon={<Wifi className="h-4 w-4" />}
                            />
                            <HealthIndicator
                                label="User Activity Monitoring"
                                status="operational"
                                icon={<Activity className="h-4 w-4" />}
                            />
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                                    Quick Stats
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Active Users</span>
                                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                            {stats?.activeUsers ?? 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Suspended</span>
                                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                            {stats?.bannedUsers ?? 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">New (30d)</span>
                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                            {stats?.newRegistrations ?? 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Management Table */}
                <div id="users-table" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex flex-col sm:flex-row w-full justify-between gap-3 sm:items-center px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                                All Users
                                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                                    ({users.length})
                                </span>
                            </h2>
                        </div>
                    </div>

                    {/* Mobile: card list */}
                    <div className="flex flex-col gap-3 p-3 sm:hidden">
                        {users.length > 0 ? (
                            users.map((u) => (
                                <MobileUserCard key={u.id} user={u} />
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No users found.</p>
                        )}
                    </div>

                    {/* Desktop: data table */}
                    <div className="hidden sm:block px-4 sm:px-5 py-4">
                        <DataTable data={users} columns={columns} />
                    </div>
                </div>
            </div>
        </>
    );
}

/** Icon component for audit log actions */
function ActionIcon({ action }: { action: string }) {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes("ban")) {
        return <ShieldAlert className="h-4 w-4 text-orange-500" />;
    }
    if (lowerAction.includes("delete") || lowerAction.includes("remove")) {
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (lowerAction.includes("resolve") || lowerAction.includes("approve")) {
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (lowerAction.includes("warning") || lowerAction.includes("warn")) {
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    return <ScrollText className="h-4 w-4 text-blue-500" />;
}

/** System health status indicator */
function HealthIndicator({ label, status, icon }: { label: string; status: "operational" | "warning" | "error"; icon: React.ReactNode }) {
    const statusConfig = {
        operational: {
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-100 dark:bg-green-900/40",
            dot: "bg-green-500",
            text: "Operational",
        },
        warning: {
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-100 dark:bg-amber-900/40",
            dot: "bg-amber-500",
            text: "Warning",
        },
        error: {
            color: "text-red-600 dark:text-red-400",
            bg: "bg-red-100 dark:bg-red-900/40",
            dot: "bg-red-500",
            text: "Error",
        },
    };

    const config = statusConfig[status];

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${config.bg} ${config.color}`}>
                    {icon}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                <span className={`text-xs font-medium ${config.color}`}>{config.text}</span>
            </div>
        </div>
    );
}
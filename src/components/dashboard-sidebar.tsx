"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
    LayoutDashboardIcon,
    UserIcon,
    PenSquareIcon,
    FolderPlusIcon,
    FolderIcon,
    MessageSquareIcon,
    SettingsIcon,
    LogOutIcon,
    UsersIcon,
    CheckSquareIcon,
    ShieldIcon,
    BarChart3Icon,
    ScrollTextIcon,
    FlagIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    FileTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface SidebarProps {
    role?: string | null;
    collapsed: boolean;
    onToggle: () => void;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
}

const userNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/update-profile", label: "My Profile", icon: UserIcon },
    { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
    { href: "/protocols/submit", label: "Submit Protocol", icon: FolderPlusIcon },
    { href: "/protocols", label: "My Protocols", icon: FolderIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const adminNavItems: NavItem[] = [
    { href: "/admin", label: "Admin Dashboard", icon: BarChart3Icon },
    { href: "/user-management", label: "User Management", icon: UsersIcon },
    { href: "/admin/pages", label: "Manage Pages", icon: FileTextIcon },
    { href: "/admin/protocol-review", label: "Protocol Review", icon: CheckSquareIcon },
    { href: "/admin/feed-moderation", label: "Feed Moderation", icon: ShieldIcon },
    { href: "/admin/community-moderation", label: "Community Moderation", icon: MessageSquareIcon },
    { href: "/admin/reports", label: "Reports", icon: FlagIcon },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollTextIcon },
    { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
    { href: "/protocols", label: "Protocols", icon: FolderIcon },
    { href: "/community", label: "Community", icon: MessageSquareIcon },
    { href: "/update-profile", label: "My Profile", icon: UserIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function DashboardSidebar({ role, collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const isAdmin = role === "admin" || role === "superadmin";
    const navItems = isAdmin ? adminNavItems : userNavItems;

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/sign-in");
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-40 transition-all duration-300 flex flex-col",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Toggle button */}
            <div className="flex justify-end p-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="h-8 w-8"
                >
                    {collapsed ? (
                        <ChevronRightIcon className="h-4 w-4" />
                    ) : (
                        <ChevronLeftIcon className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2 pb-4">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.href + item.label}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900",
                                        collapsed && "justify-center px-2"
                                    )}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon className="h-5 w-5 shrink-0" />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Logout */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-2">
                <button
                    onClick={handleSignOut}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 transition-colors w-full",
                        collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? "Logout" : undefined}
                >
                    <LogOutIcon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    BellIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import CommunityUnreadBadge from "@/components/community/community-unread-badge";
import { markCommunityRead } from "@/app/actions/community";

interface SidebarProps {
    role?: string | null;
    collapsed: boolean;
    onToggle: () => void;
    /**
     * Exact community unread count (backend integer, not "99+").
     * Defaults to 0 so existing call sites keep compiling.
     */
    communityUnreadCount?: number;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    /** Renders a Community-style badge when the item's href is "/community". */
    badgeCount?: number;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

function buildUserSections(): NavSection[] {
    return [
        {
            title: "Main",
            items: [
                { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
                { href: "/protocols", label: "Protocols", icon: FolderIcon },
                { href: "/notifications", label: "Notifications", icon: BellIcon },
            ],
        },
        {
            title: "Actions",
            items: [
                { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
                { href: "/protocols/submit", label: "Submit Protocol", icon: FolderPlusIcon },
            ],
        },
        {
            title: "Account",
            items: [
                { href: "/update-profile", label: "My Profile", icon: UserIcon },
                { href: "/settings", label: "Settings", icon: SettingsIcon },
            ],
        },
    ];
}

function buildAdminSections(communityUnreadCount: number): NavSection[] {
    return [
        {
            title: "Main",
            items: [
                { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
                { href: "/protocols", label: "Protocols", icon: FolderIcon },
                {
                    href: "/community",
                    label: "Community",
                    icon: MessageSquareIcon,
                    badgeCount: communityUnreadCount,
                },
                { href: "/notifications", label: "Notifications", icon: BellIcon },
            ],
        },
        {
            title: "Admin",
            items: [
                { href: "/user-management", label: "User Management", icon: UsersIcon },
                { href: "/admin/protocol-review", label: "Protocol Review", icon: CheckSquareIcon },
                { href: "/admin/feed-moderation", label: "Feed Moderation", icon: ShieldIcon },
                { href: "/admin/community-moderation", label: "Community Mod.", icon: MessageSquareIcon },
                { href: "/admin/pages", label: "Manage Pages", icon: FileTextIcon },
                { href: "/admin/reports", label: "Reports", icon: FlagIcon },
                { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollTextIcon },
            ],
        },
        {
            title: "Account",
            items: [
                { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
                { href: "/update-profile", label: "My Profile", icon: UserIcon },
                { href: "/settings", label: "Settings", icon: SettingsIcon },
            ],
        },
    ];
}

function buildSuperAdminSections(communityUnreadCount: number): NavSection[] {
    return [
        {
            title: "Main",
            items: [
                { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
                { href: "/protocols", label: "Protocols", icon: FolderIcon },
                {
                    href: "/community",
                    label: "Community",
                    icon: MessageSquareIcon,
                    badgeCount: communityUnreadCount,
                },
                { href: "/notifications", label: "Notifications", icon: BellIcon },
            ],
        },
        {
            title: "Admin",
            items: [
                { href: "/user-management", label: "User Management", icon: UsersIcon },
                { href: "/admin/protocol-review", label: "Protocol Review", icon: CheckSquareIcon },
                { href: "/admin/feed-moderation", label: "Feed Moderation", icon: ShieldIcon },
                { href: "/admin/community-moderation", label: "Community Mod.", icon: MessageSquareIcon },
                { href: "/admin/pages", label: "Manage Pages", icon: FileTextIcon },
                { href: "/admin/reports", label: "Reports", icon: FlagIcon },
                { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollTextIcon },
            ],
        },
        {
            title: "Analytics",
            items: [
                { href: "/admin", label: "Platform Stats", icon: BarChart3Icon },
            ],
        },
        {
            title: "Account",
            items: [
                { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
                { href: "/update-profile", label: "My Profile", icon: UserIcon },
                { href: "/settings", label: "Settings", icon: SettingsIcon },
            ],
        },
    ];
}

export default function DashboardSidebar({
                                             role,
                                             collapsed,
                                             onToggle,
                                             communityUnreadCount = 0,
                                         }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const sections =
        role === "superadmin"
            ? buildSuperAdminSections(communityUnreadCount)
            : role === "admin"
                ? buildAdminSections(communityUnreadCount)
                : buildUserSections();

    React.useEffect(() => {
        if (pathname === "/community" && communityUnreadCount > 0) {
            markCommunityRead().catch((err) =>
                console.error("[sidebar] markCommunityRead failed:", err)
            );
        }
    }, [pathname, communityUnreadCount]);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/sign-in");
    };

    const hideCommunityBadge = pathname === "/community";

    return (
        <aside
            className={cn(
                "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 transition-all duration-300 flex flex-col",
                collapsed ? "w-16" : "w-64"
            )}
        >
            <div className="flex justify-end p-2">
                <button
                    onClick={onToggle}
                    className="flex items-center justify-center h-8 w-8 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    {collapsed ? (
                        <ChevronRightIcon className="h-4 w-4" />
                    ) : (
                        <ChevronLeftIcon className="h-4 w-4" />
                    )}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 pb-4">
                {sections.map((section, sectionIdx) => (
                    <div key={section.title} className={cn(sectionIdx > 0 && "mt-4")}>
                        {!collapsed && (
                            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                {section.title}
                            </p>
                        )}
                        {collapsed && sectionIdx > 0 && (
                            <div className="mx-3 mb-2 border-t border-gray-200 dark:border-gray-700" />
                        )}
                        <ul className="space-y-0.5">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/admin" &&
                                        item.href !== "/dashboard" &&
                                        pathname.startsWith(item.href));

                                const badgeCount =
                                    item.href === "/community" && !hideCommunityBadge
                                        ? item.badgeCount ?? 0
                                        : 0;

                                return (
                                    <li key={item.href + item.label}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                                                collapsed && "justify-center px-2"
                                            )}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <Icon className="h-5 w-5 shrink-0" />
                                            {!collapsed && <span>{item.label}</span>}
                                            {badgeCount > 0 && (
                                                <CommunityUnreadBadge
                                                    count={badgeCount}
                                                    collapsed={collapsed}
                                                />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                <button
                    onClick={handleSignOut}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300 transition-colors w-full",
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
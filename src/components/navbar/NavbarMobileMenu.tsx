"use client";

import React from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    MenuIcon,
    LogOutIcon,
    LayoutDashboardIcon,
    FolderIcon,
    MessageSquareIcon,
    BellIcon,
    PenSquareIcon,
    FolderPlusIcon,
    UserIcon,
    SettingsIcon,
    UsersIcon,
    CheckSquareIcon,
    ShieldIcon,
    FileTextIcon,
    FlagIcon,
    ScrollTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavbarPage, NavbarProps, NavItem } from "./types";
import { OurPagesDropdown } from "./NavbarOurPagesDropdown";
import { ResourcesMobileDropdown } from "./NavbarResourcesDropdown";
import { EthicalClearanceMobileDropdown } from "./NavbarEthicalClearanceDropdown";
import { MobileDynamicPageDropdown } from "./NavbarDynamicPageDropdown";

const userMobileNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/protocols", label: "Protocols", icon: FolderIcon },
    { href: "/community", label: "Community", icon: MessageSquareIcon },
    { href: "/notifications", label: "Notifications", icon: BellIcon },
    { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
    { href: "/protocols/submit", label: "Submit Protocol", icon: FolderPlusIcon },
    { href: "/update-profile", label: "My Profile", icon: UserIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const adminMobileNavItems: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/protocols", label: "Protocols", icon: FolderIcon },
    { href: "/community", label: "Community", icon: MessageSquareIcon },
    { href: "/notifications", label: "Notifications", icon: BellIcon },
    { href: "/user-management", label: "User Management", icon: UsersIcon },
    { href: "/admin/protocol-review", label: "Protocol Review", icon: CheckSquareIcon },
    { href: "/admin/feed-moderation", label: "Feed Moderation", icon: ShieldIcon },
    { href: "/admin/community-moderation", label: "Community Mod.", icon: MessageSquareIcon },
    { href: "/admin/pages", label: "Manage Pages", icon: FileTextIcon },
    { href: "/admin/reports", label: "Reports", icon: FlagIcon },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollTextIcon },
    { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
    { href: "/update-profile", label: "My Profile", icon: UserIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
];

interface NavbarMobileMenuProps {
    user: NavbarProps["user"];
    userInitials: string;
    isAdmin: boolean;
    notificationCount: number;
    pathname: string;
    pages: NavbarPage[];
    handleSignOut: () => Promise<void>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function NavbarMobileMenu({
    user,
    userInitials,
    isAdmin,
    notificationCount,
    pathname,
    pages,
    handleSignOut,
    open,
    onOpenChange,
}: NavbarMobileMenuProps) {
    const mobileNavItems = isAdmin ? adminMobileNavItems : userMobileNavItems;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                    <MenuIcon className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 overflow-y-auto">
                <div className="flex flex-col gap-2 p-4 pt-8">
                    {user ? (
                        <>
                            {/* User Info Header */}
                            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-800">
                                <Avatar className="h-12 w-12 border-2 border-gray-200 dark:border-gray-700">
                                    <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                                    <AvatarFallback className="bg-blue-700 text-white dark:bg-blue-600">
                                        {userInitials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {user.name || "User"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {user.email}
                                    </p>
                                    {isAdmin && (
                                        <span className={cn(
                                            "mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium w-fit",
                                            user?.role === "superadmin"
                                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                        )}>
                                            {user?.role === "superadmin" ? "Super Admin" : "Admin"}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* All Navigation Links */}
                            <div className="flex flex-col gap-0.5 py-2">
                                {mobileNavItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    const isNotification = item.href === "/notifications";
                                    return (
                                        <Link
                                            key={`${item.href}-${item.label}`}
                                            href={item.href}
                                            onClick={() => onOpenChange(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                                                isActive
                                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                                    : "text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                                            )}
                                        >
                                            <Icon className="h-5 w-5 shrink-0" />
                                            <span className="flex-1">{item.label}</span>
                                            {isNotification && notificationCount > 0 && (
                                                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold leading-none text-white bg-red-600 rounded-full">
                                                    {notificationCount > 99 ? "99+" : notificationCount}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Our Pages Section */}
                            <div className="border-t border-gray-200 dark:border-gray-800 pt-2">
                                <OurPagesDropdown pathname={pathname} onNavigate={() => onOpenChange(false)} />
                                <ResourcesMobileDropdown onNavigate={() => onOpenChange(false)} />
                                <EthicalClearanceMobileDropdown onNavigate={() => onOpenChange(false)} />
                                {/* Admin-created dynamic pages */}
                                {pages.map((page) => (
                                    <MobileDynamicPageDropdown key={page.id} page={page} onNavigate={() => onOpenChange(false)} />
                                ))}
                            </div>

                            {/* Logout */}
                            <div className="border-t border-gray-200 dark:border-gray-800 pt-2">
                                <Button
                                    onClick={handleSignOut}
                                    variant="ghost"
                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                >
                                    <LogOutIcon className="mr-2 h-5 w-5" />
                                    Logout
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Sign In / Sign Up */}
                            <div className="flex flex-col gap-2 pb-4 border-b border-gray-200 dark:border-gray-800">
                                <Link href="/sign-in" onClick={() => onOpenChange(false)}>
                                    <Button variant="outline" className="w-full text-sm font-medium">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/sign-up" onClick={() => onOpenChange(false)}>
                                    <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium">
                                        Sign Up
                                    </Button>
                                </Link>
                            </div>

                            {/* Our Pages Dropdown */}
                            <div className="py-2">
                                <OurPagesDropdown pathname={pathname} onNavigate={() => onOpenChange(false)} />
                                <ResourcesMobileDropdown onNavigate={() => onOpenChange(false)} />
                                <EthicalClearanceMobileDropdown onNavigate={() => onOpenChange(false)} />
                                {/* Admin-created dynamic pages */}
                                {pages.map((page) => (
                                    <MobileDynamicPageDropdown key={page.id} page={page} onNavigate={() => onOpenChange(false)} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

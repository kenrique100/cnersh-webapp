"use client";

import Link from "next/link";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    MenuIcon,
    LogOutIcon,
    UserIcon,
    SettingsIcon,
    LayoutDashboardIcon,
    PenSquareIcon,
    FolderIcon,
    MessageSquareIcon,
    BellIcon,
    FolderPlusIcon,
    UsersIcon,
    CheckSquareIcon,
    ShieldIcon,
    BarChart3Icon,
    ScrollTextIcon,
    FlagIcon,
    FileTextIcon,
    ChevronDownIcon,
    BuildingIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import NotificationDropdown from "@/components/notification-dropdown";

interface NavbarProps {
    user?: {
        name: string | null;
        email: string;
        image: string | null;
        role?: string | null;
    } | null;
    notificationCount?: number;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
}

const userMobileNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/update-profile", label: "My Profile", icon: UserIcon },
    { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
    { href: "/projects/submit", label: "Submit Project", icon: FolderPlusIcon },
    { href: "/projects", label: "My Projects", icon: FolderIcon },
    { href: "/community", label: "Community", icon: MessageSquareIcon },
    { href: "/notifications", label: "Notifications", icon: BellIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const adminMobileNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/admin", label: "Admin Overview", icon: BarChart3Icon },
    { href: "/user-management", label: "User Management", icon: UsersIcon },
    { href: "/admin/pages", label: "Manage Pages", icon: FileTextIcon },
    { href: "/admin/project-review", label: "Project Review", icon: CheckSquareIcon },
    { href: "/admin/feed-moderation", label: "Feed Moderation", icon: ShieldIcon },
    { href: "/admin/community-moderation", label: "Community Moderation", icon: MessageSquareIcon },
    { href: "/admin/reports", label: "Reports", icon: FlagIcon },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollTextIcon },
    { href: "/feeds", label: "Feeds", icon: PenSquareIcon },
    { href: "/projects", label: "Projects", icon: FolderIcon },
    { href: "/community", label: "Community", icon: MessageSquareIcon },
    { href: "/notifications", label: "Notifications", icon: BellIcon },
    { href: "/update-profile", label: "My Profile", icon: UserIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function OurPagesDropdown({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors w-full text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950"
            >
                <FileTextIcon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Our Pages</span>
                <ChevronDownIcon className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="ml-6 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 pb-2">
                    <Link
                        href="/pages/about"
                        onClick={onNavigate}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                            pathname === "/pages/about"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                : "text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                        )}
                    >
                        <UsersIcon className="h-4 w-4 shrink-0" />
                        About Us
                    </Link>
                    <Link
                        href="/pages/contract-rex"
                        onClick={onNavigate}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                            pathname === "/pages/contract-rex"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                : "text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                        )}
                    >
                        <BuildingIcon className="h-4 w-4 shrink-0" />
                        Contract Rex Org
                    </Link>
                    <Link
                        href="/pages"
                        onClick={onNavigate}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                            pathname === "/pages"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                : "text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950"
                        )}
                    >
                        <FileTextIcon className="h-4 w-4 shrink-0" />
                        View All Pages
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function Navbar({ user, notificationCount = 0 }: NavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/");
    };

    const userInitials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.slice(0, 2).toUpperCase() || "U";

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    const mobileNavItems = isAdmin ? adminMobileNavItems : userMobileNavItems;

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
            <div className="container mx-auto max-w-7xl">
                <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Left Side - Logo */}
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-white border border-gray-200 dark:border-gray-600 shadow-sm">
                                <Image
                                    src="/logo.png"
                                    alt="CNEC"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 object-contain"
                                    priority
                                />
                            </div>
                            <span className="hidden sm:block text-xl font-bold text-gray-900 dark:text-gray-100">
                                CNEC
                            </span>
                        </Link>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {user ? (
                            <>
                                <NotificationDropdown count={notificationCount} />

                                {/* Desktop: User Avatar Dropdown */}
                                <div className="hidden md:block">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-3 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                                <Avatar className="h-10 w-10 border-2 border-gray-200 dark:border-gray-700">
                                                    <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                                                    <AvatarFallback className="bg-blue-700 text-white dark:bg-blue-600">
                                                        {userInitials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="hidden lg:block text-left">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {user.name || "User"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {user.name || "User"}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <DropdownMenuItem asChild>
                                                <Link href="/update-profile" className="cursor-pointer">
                                                    <UserIcon className="mr-2 h-4 w-4" />
                                                    <span>View Profile</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/settings" className="cursor-pointer">
                                                    <SettingsIcon className="mr-2 h-4 w-4" />
                                                    <span>Settings</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={handleSignOut}
                                                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950"
                                            >
                                                <LogOutIcon className="mr-2 h-4 w-4" />
                                                <span>Logout</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Mobile Menu Toggle - opens from RIGHT */}
                                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                    <SheetTrigger asChild className="md:hidden">
                                        <Button variant="ghost" size="icon">
                                            <MenuIcon className="h-6 w-6" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 overflow-y-auto">
                                        <div className="flex flex-col gap-2 p-4 pt-8">
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
                                                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 w-fit">
                                                            Admin
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
                                                            onClick={() => setIsMobileMenuOpen(false)}
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
                                                <OurPagesDropdown pathname={pathname} onNavigate={() => setIsMobileMenuOpen(false)} />
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
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </>
                        ) : (
                            <>
                                {/* Desktop: Sign In + Sign Up buttons */}
                                <div className="hidden sm:flex items-center gap-3">
                                    <Link href="/sign-in">
                                        <Button variant="ghost" className="text-sm font-medium">
                                            Sign In
                                        </Button>
                                    </Link>
                                    <Link href="/sign-up">
                                        <Button className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium">
                                            Sign Up
                                        </Button>
                                    </Link>
                                </div>

                                {/* Mobile: Hamburger menu with Our Pages + Sign In/Up */}
                                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                    <SheetTrigger asChild className="sm:hidden">
                                        <Button variant="ghost" size="icon">
                                            <MenuIcon className="h-6 w-6" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 overflow-y-auto">
                                        <div className="flex flex-col gap-2 p-4 pt-8">
                                            {/* Sign In / Sign Up */}
                                            <div className="flex flex-col gap-2 pb-4 border-b border-gray-200 dark:border-gray-800">
                                                <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button variant="outline" className="w-full text-sm font-medium">
                                                        Sign In
                                                    </Button>
                                                </Link>
                                                <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium">
                                                        Sign Up
                                                    </Button>
                                                </Link>
                                            </div>

                                            {/* Our Pages Dropdown */}
                                            <div className="py-2">
                                                <OurPagesDropdown pathname={pathname} onNavigate={() => setIsMobileMenuOpen(false)} />
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

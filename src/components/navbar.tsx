"use client";

import Link from "next/link";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import NotificationDropdown from "@/components/notification-dropdown";
import type { NavbarProps } from "./navbar/types";
import NavbarThemeToggle from "./navbar/NavbarThemeToggle";
import SOPsDesktopSubmenuNav from "./navbar/NavbarSOPsDropdown";
import OurPagesDesktopDropdown from "./navbar/NavbarOurPagesDropdown";
import { ResourcesDesktopDropdown } from "./navbar/NavbarResourcesDropdown";
import { EthicalClearanceDesktopDropdown } from "./navbar/NavbarEthicalClearanceDropdown";
import { DynamicPageDesktopDropdown } from "./navbar/NavbarDynamicPageDropdown";
import NavbarUserMenu from "./navbar/NavbarUserMenu";
import NavbarMobileMenu from "./navbar/NavbarMobileMenu";
import NavbarLanguageSwitcher from "./navbar/NavbarLanguageSwitcher";


export default function Navbar({ user, notificationCount = 0, pages = [] }: NavbarProps) {
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

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
            <div className="container mx-auto max-w-7xl">
                <div className="flex min-h-16 items-center justify-between px-4 sm:px-6 lg:px-8 py-2">
                    {/* Left Side - Logo */}
                    <div className="flex items-center shrink-0">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-white border border-gray-200 dark:border-gray-600 shadow-sm">
                                <Image
                                    src="/logo.png"
                                    alt="CNERSH"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 object-contain"
                                    priority
                                />
                            </div>
                            <span className="hidden sm:block text-xl font-bold text-gray-900 dark:text-gray-100">
                                CNERSH
                            </span>
                        </Link>
                    </div>

                    {/* Center - Desktop nav items — visible from lg+ */}
                    <div className="hidden lg:flex items-center justify-center gap-1 flex-1 min-w-0 mx-2 flex-wrap">
                        <ResourcesDesktopDropdown />
                        <EthicalClearanceDesktopDropdown />
                        <SOPsDesktopSubmenuNav />
                        {/* Admin-created dynamic pages */}
                        {pages.map((page) => (
                            <DynamicPageDesktopDropdown key={page.id} page={page} />
                        ))}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Our Pages Desktop Dropdown - visible for all users */}
                        <OurPagesDesktopDropdown pathname={pathname} />

                        {/* Desktop Language Switcher - always visible on sm+ */}
                        <div className="hidden sm:flex">
                            <NavbarLanguageSwitcher />
                        </div>

                        {user ? (
                            <>
                                {/* Theme Toggle */}
                                <NavbarThemeToggle />

                                <NotificationDropdown count={notificationCount} />

                                {/* Desktop: User Avatar Dropdown */}
                                <NavbarUserMenu
                                    user={user}
                                    userInitials={userInitials}
                                    handleSignOut={handleSignOut}
                                />

                                {/* Mobile Menu Toggle - opens from RIGHT */}
                                <NavbarMobileMenu
                                    user={user}
                                    userInitials={userInitials}
                                    isAdmin={isAdmin}
                                    notificationCount={notificationCount}
                                    pathname={pathname}
                                    pages={pages}
                                    handleSignOut={handleSignOut}
                                    open={isMobileMenuOpen}
                                    onOpenChange={setIsMobileMenuOpen}
                                />
                            </>
                        ) : (
                            <>
                                {/* Theme Toggle (for non-logged-in users) */}
                                <NavbarThemeToggle />

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
                                <NavbarMobileMenu
                                    user={user}
                                    userInitials={userInitials}
                                    isAdmin={isAdmin}
                                    notificationCount={notificationCount}
                                    pathname={pathname}
                                    pages={pages}
                                    handleSignOut={handleSignOut}
                                    open={isMobileMenuOpen}
                                    onOpenChange={setIsMobileMenuOpen}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

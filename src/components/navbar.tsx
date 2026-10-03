"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { signOutAndClearBrowserData } from "@/lib/sign-out";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import NotificationDropdown from "@/components/notification-dropdown";
import type { NavbarProps } from "./navbar/types";
import SOPsDesktopSubmenuNav from "./navbar/NavbarSOPsDropdown";
import { ResourcesDesktopDropdown } from "./navbar/NavbarResourcesDropdown";
import { EthicalClearanceDesktopDropdown } from "./navbar/NavbarEthicalClearanceDropdown";
import { DynamicPageDesktopDropdown } from "./navbar/NavbarDynamicPageDropdown";
import NavbarUserMenu from "./navbar/NavbarUserMenu";
import NavbarMobileMenu from "./navbar/NavbarMobileMenu";
import NavbarLanguageSwitcher from "./navbar/NavbarLanguageSwitcher";

export default function Navbar({ user, notificationCount = 0, pages = [] }: NavbarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleSignOut = async () => {
        try {
            await signOutAndClearBrowserData("/");
        } catch {
            toast.error("Sign out failed. Please try again.");
        }
    };

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
            <div className="container mx-auto max-w-7xl">
                <div className="flex min-h-16 items-center justify-between px-4 sm:px-6 lg:px-8 py-2">

                    {/* Left: Logo */}
                    <div className="flex items-center shrink-0">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-white dark:bg-white border border-gray-200 dark:border-gray-600 shadow-sm">
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

                    {/* Center: Desktop nav dropdowns */}
                    <div className="hidden lg:flex items-center justify-center gap-1 flex-1 min-w-0 mx-2 flex-wrap">
                        <ResourcesDesktopDropdown />
                        <EthicalClearanceDesktopDropdown />
                        <SOPsDesktopSubmenuNav />
                        {pages.map((page) => (
                            <DynamicPageDesktopDropdown key={page.id} page={page} />
                        ))}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1.5 sm:gap-3">

                        {/*
                         * Case 16: single language switcher, always rendered in the
                         * navbar bar. It is compact on phones and slightly larger on
                         * sm+. The mobile sheet (NavbarMobileMenu) does NOT render a
                         * second copy anymore — one switcher per viewport.
                         */}
                        <NavbarLanguageSwitcher />

                        {user ? (
                            <>
                                <NotificationDropdown count={notificationCount} />
                                <NavbarUserMenu
                                    user={user}
                                    handleSignOut={handleSignOut}
                                />
                                <NavbarMobileMenu
                                    user={user}
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
                                <NavbarMobileMenu
                                    user={user}
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
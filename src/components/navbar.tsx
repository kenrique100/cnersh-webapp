"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MenuIcon, SettingsIcon, LogOutIcon, HomeIcon, UsersIcon } from "lucide-react";
import Image from "next/image";

interface NavbarProps {
    user?: {
        name: string | null;
        email: string;
        image: string | null;
    } | null;
}

export default function Navbar({ user }: NavbarProps) {
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/sign-in");
    };

    const navLinks = user ? [
        { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
        { href: "/user-management", label: "Users", icon: UsersIcon },
        { href: "/update-profile", label: "Profile", icon: UserIcon },
    ] : [];

    const userInitials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.slice(0, 2).toUpperCase() || "U";

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
            <div className="container mx-auto max-w-7xl">
                <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-700 dark:bg-blue-600">
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

                    {/* Desktop Navigation */}
                    {user && (
                        <div className="hidden md:flex items-center gap-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm font-medium text-gray-700 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-500 transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Right Side - User Menu or Auth Links */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                {/* Desktop User Menu */}
                                <div className="hidden md:block">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                                <Avatar className="h-10 w-10 border-2 border-gray-200 dark:border-gray-700">
                                                    <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                                                    <AvatarFallback className="bg-blue-700 text-white dark:bg-blue-600">
                                                        {userInitials}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56" align="end" forceMount>
                                            <DropdownMenuLabel className="font-normal">
                                                <div className="flex flex-col space-y-1">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {user.name || "User"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href="/update-profile" className="cursor-pointer">
                                                    <SettingsIcon className="mr-2 h-4 w-4" />
                                                    <span>Profile Settings</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 dark:text-red-400">
                                                <LogOutIcon className="mr-2 h-4 w-4" />
                                                <span>Sign out</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Mobile Menu Toggle */}
                                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                    <SheetTrigger asChild className="md:hidden">
                                        <Button variant="ghost" size="icon">
                                            <MenuIcon className="h-6 w-6" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                                        <div className="flex flex-col gap-6 mt-6">
                                            {/* User Info */}
                                            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-800">
                                                <Avatar className="h-12 w-12 border-2 border-gray-200 dark:border-gray-700">
                                                    <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                                                    <AvatarFallback className="bg-blue-700 text-white dark:bg-blue-600">
                                                        {userInitials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {user.name || "User"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Navigation Links */}
                                            <div className="flex flex-col gap-2">
                                                {navLinks.map((link) => {
                                                    const Icon = link.icon;
                                                    return (
                                                        <Link
                                                            key={link.href}
                                                            href={link.href}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-500 dark:hover:bg-blue-950 rounded-md transition-colors"
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                            {link.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                                                <Button
                                                    onClick={handleSignOut}
                                                    variant="ghost"
                                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                                >
                                                    <LogOutIcon className="mr-2 h-5 w-5" />
                                                    Sign out
                                                </Button>
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
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
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
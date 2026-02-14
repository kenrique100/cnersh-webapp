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
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MenuIcon, SettingsIcon, LogOutIcon, HomeIcon, UsersIcon, UserIcon, FileTextIcon, FilePlusIcon, ChevronDownIcon } from "lucide-react";
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
    const [isFormsOpen, setIsFormsOpen] = React.useState(false);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/sign-in");
    };

    const navLinks = user ? [
        { href: "/update-profile", label: "Profile", icon: UserIcon },
        { href: "/", label: "Community", icon: HomeIcon },
        { href: "/user-management", label: "Users", icon: UsersIcon },
    ] : [];

    const userInitials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.slice(0, 2).toUpperCase() || "U";

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
            <div className="container mx-auto max-w-7xl">
                <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Left Side - User Avatar (for dashboard) or Logo (for landing) */}
                    <div className="flex items-center gap-2">
                        {user ? (
                            // Dashboard: Profile picture at top left
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-gray-200 dark:border-gray-700">
                                    <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                                    <AvatarFallback className="bg-blue-700 text-white dark:bg-blue-600">
                                        {userInitials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {user.name || "User"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            // Landing: Logo at top left
                            <Link href="/" className="flex items-center gap-2">
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
                        )}
                    </div>

                    {/* Desktop Navigation - Center/Left */}
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
                            
                            {/* Forms Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="text-sm font-medium text-gray-700 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-500 transition-colors gap-1">
                                        Forms
                                        <ChevronDownIcon className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem asChild>
                                        <Link href="/forms/add" className="cursor-pointer">
                                            <FilePlusIcon className="mr-2 h-4 w-4" />
                                            <span>Add Form</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/forms/view" className="cursor-pointer">
                                            <FileTextIcon className="mr-2 h-4 w-4" />
                                            <span>View Forms</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            
                            <Link
                                href="/settings"
                                className="text-sm font-medium text-gray-700 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-500 transition-colors"
                            >
                                Settings
                            </Link>
                        </div>
                    )}

                    {/* Right Side - Logo (for dashboard) or Auth buttons (for landing) */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                {/* Dashboard: Logo at top right */}
                                <Link href="/dashboard" className="hidden md:flex items-center gap-2">
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
                                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        CNEC
                                    </span>
                                </Link>

                                {/* Desktop Logout Button */}
                                <div className="hidden md:block">
                                    <Button
                                        onClick={handleSignOut}
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                    >
                                        <LogOutIcon className="mr-2 h-4 w-4" />
                                        Logout
                                    </Button>
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

                                                {/* Forms Collapsible */}
                                                <Collapsible open={isFormsOpen} onOpenChange={setIsFormsOpen}>
                                                    <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-500 dark:hover:bg-blue-950 rounded-md transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <FileTextIcon className="h-5 w-5" />
                                                            Forms
                                                        </div>
                                                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isFormsOpen ? "rotate-180" : ""}`} />
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="ml-8 mt-2 space-y-2">
                                                        <Link
                                                            href="/forms/add"
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-500 dark:hover:bg-blue-950 rounded-md transition-colors"
                                                        >
                                                            <FilePlusIcon className="h-4 w-4" />
                                                            Add Form
                                                        </Link>
                                                        <Link
                                                            href="/forms/view"
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-500 dark:hover:bg-blue-950 rounded-md transition-colors"
                                                        >
                                                            <FileTextIcon className="h-4 w-4" />
                                                            View Forms
                                                        </Link>
                                                    </CollapsibleContent>
                                                </Collapsible>

                                                <Link
                                                    href="/settings"
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-500 dark:hover:bg-blue-950 rounded-md transition-colors"
                                                >
                                                    <SettingsIcon className="h-5 w-5" />
                                                    Settings
                                                </Link>
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
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
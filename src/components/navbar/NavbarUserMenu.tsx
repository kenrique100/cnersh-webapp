"use client";

import React from "react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOutIcon, UserIcon, SettingsIcon } from "lucide-react";
import type { NavbarProps } from "./types";
import UserAvatar from "@/components/user-avatar";

interface NavbarUserMenuProps {
    user: NonNullable<NavbarProps["user"]>;
    handleSignOut: () => Promise<void>;
}

export default function NavbarUserMenu({ user, handleSignOut }: NavbarUserMenuProps) {
    return (
        <div className="hidden lg:block">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <UserAvatar
                            name={user.name}
                            image={user.image}
                            gender={user.gender}
                            className="h-10 w-10 border-2 border-gray-200 dark:border-gray-700"
                            fallbackClassName="dark:bg-blue-600"
                        />
                        <div className="hidden xl:block text-left">
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
                        <Link href="/update-profile">
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>View Profile</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/settings">
                            <SettingsIcon className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={handleSignOut}
                        className="text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950"
                    >
                        <LogOutIcon className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

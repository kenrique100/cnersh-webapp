"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import React from "react";

export default function DashboardLayout({
                                            children,
                                        }: Readonly<{
    children: React.ReactNode;
}>) {
    const router = useRouter();

    return (
        <div className="w-full min-h-dvh min-w-dvw bg-white overflow-hidden">
            <nav className="w-full flex justify-end items-center pr-6 h-16 shadow-lg mx-auto max-w-7xl mb-6 overflow-hidden bg-neutral-50 rounded-md">
                <Button
                    className="cursor-pointer"
                    onClick={async () => {
                        await authClient.signOut();
                        router.push("/sign-in");
                    }}
                >
                    Sign out
                </Button>
            </nav>
            {children}
        </div>
    );
}
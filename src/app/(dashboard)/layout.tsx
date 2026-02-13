import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import Navbar from "@/components/navbar";
import React from "react";

export default async function DashboardLayout({
                                            children,
                                        }: Readonly<{
    children: React.ReactNode;
}>) {
    await authIsRequired();
    const user = await updateProfile();

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar user={user ? {
                name: user.name,
                email: user.email,
                image: user.image
            } : null} />
            <main className="w-full">
                {children}
            </main>
        </div>
    );
}
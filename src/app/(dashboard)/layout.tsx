import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";
import DashboardShell from "@/components/dashboard-shell";
import React from "react";

export default async function DashboardLayout({
                                            children,
                                        }: Readonly<{
    children: React.ReactNode;
}>) {
    await authIsRequired();
    const [user, unreadCount] = await Promise.all([
        updateProfile(),
        getUnreadNotificationCount(),
    ]);

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar user={user ? {
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
            } : null} notificationCount={unreadCount} />
            <DashboardShell role={user?.role}>
                {children}
            </DashboardShell>
        </div>
    );
}
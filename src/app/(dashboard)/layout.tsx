import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { getPages } from "@/app/actions/page-actions";
import Navbar from "@/components/navbar";
import DashboardShell from "@/components/dashboard-shell";
import ChatBox from "@/components/chat-box";
import React from "react";

export default async function DashboardLayout({
                                            children,
                                        }: Readonly<{
    children: React.ReactNode;
}>) {
    await authIsRequired();

    let user: Awaited<ReturnType<typeof updateProfile>> = null;
    let unreadCount = 0;
    let pages: Awaited<ReturnType<typeof getPages>> = [];

    try {
        [user, unreadCount, pages] = await Promise.all([
            updateProfile(),
            getUnreadNotificationCount(),
            getPages(),
        ]);
    } catch (error) {
        console.error("Error fetching dashboard layout data:", error);
    }

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar user={user ? {
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
            } : null} notificationCount={unreadCount} pages={pages} />
            <DashboardShell role={user?.role}>
                {children}
            </DashboardShell>
            <ChatBox />
        </div>
    );
}
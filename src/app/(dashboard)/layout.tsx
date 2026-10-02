import { authIsRequired } from "@/lib/auth-utils";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { getCommunityUnreadCount } from "@/app/actions/community";
import { getPages } from "@/app/actions/page-actions";
import Navbar from "@/components/navbar";
import DashboardShell from "@/components/dashboard-shell";
import React from "react";
import UserStorageGuard from "@/components/user-storage-guard";

export default async function DashboardLayout({
                                                  children,
                                              }: Readonly<{
    children: React.ReactNode;
}>) {
    // Single authoritative session lookup for the whole render.
    //
    // The proxy no longer queries the session on page navigations — it only
    // checks for cookie presence. `authIsRequired` is the one and only place
    // that performs the real lookup, and it is wrapped in React `cache()`.
    const session = await authIsRequired();

    let unreadCount = 0;
    let communityUnreadCount = 0;
    let pages: Awaited<ReturnType<typeof getPages>> = [];

    // Every helper below calls `verifiedAuthSession()`, which shares the same
    // cached lookup — so no additional session queries happen here.
    try {
        [unreadCount, communityUnreadCount, pages] = await Promise.all([
            getUnreadNotificationCount(),
            getCommunityUnreadCount(),
            getPages(),
        ]);
    } catch (error) {
        console.error("Error fetching dashboard layout data:", error);
    }

    const user = {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
        gender: session.user.gender ?? null,
        role: session.user.role ?? null,
        profession: session.user.profession ?? null,
        title: session.user.title ?? null,
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
            <UserStorageGuard userId={session.user.id} />
            <Navbar
                user={{
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    gender: user.gender,
                    role: user.role,
                }}
                notificationCount={unreadCount}
                pages={pages}
            />
            <DashboardShell
                role={user.role}
                communityUnreadCount={communityUnreadCount}
            >
                {children}
            </DashboardShell>
        </div>
    );
}
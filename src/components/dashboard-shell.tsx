"use client";

import React from "react";
import DashboardSidebar from "./dashboard-sidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardShellProps {
    children: React.ReactNode;
    role?: string | null;
    /** Exact community unread count (backend integer, not "99+"). */
    communityUnreadCount?: number;
}

export default function DashboardShell({
                                           children,
                                           role,
                                           communityUnreadCount = 0,
                                       }: DashboardShellProps) {
    const isMobile = useIsMobile();
    const [userCollapsed, setUserCollapsed] = React.useState(false);
    const collapsed = isMobile ? true : userCollapsed;

    return (
        <div className="flex min-h-[calc(100vh-4rem)]">
            <div className={cn("hidden md:block")}>
                <DashboardSidebar
                    role={role}
                    collapsed={collapsed}
                    onToggle={() => setUserCollapsed((prev) => !prev)}
                    communityUnreadCount={communityUnreadCount}
                />
            </div>

            <main
                className={cn(
                    "flex-1 transition-all duration-300",
                    !isMobile && (collapsed ? "md:ml-16" : "md:ml-64")
                )}
            >
                {children}
            </main>
        </div>
    );
}
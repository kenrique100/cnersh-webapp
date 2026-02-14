"use client";

import React from "react";
import DashboardSidebar from "./dashboard-sidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardShellProps {
    children: React.ReactNode;
    role?: string | null;
}

export default function DashboardShell({ children, role }: DashboardShellProps) {
    const isMobile = useIsMobile();
    const [collapsed, setCollapsed] = React.useState(false);

    // Auto-collapse on mobile
    React.useEffect(() => {
        setCollapsed(isMobile);
    }, [isMobile]);

    return (
        <div className="flex min-h-[calc(100vh-4rem)]">
            {/* Sidebar - hidden on mobile when collapsed */}
            <div className={cn("hidden md:block")}>
                <DashboardSidebar
                    role={role}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(!collapsed)}
                />
            </div>

            {/* Main content */}
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

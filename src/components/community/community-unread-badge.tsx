"use client";

import { cn } from "@/lib/utils";

const MAX_DISPLAY_COUNT = 99;

export function formatBadgeCount(count: number): string {
    return count > MAX_DISPLAY_COUNT ? `${MAX_DISPLAY_COUNT}+` : String(count);
}

interface CommunityUnreadBadgeProps {
    count: number;
    collapsed?: boolean;
    className?: string;
}

export default function CommunityUnreadBadge({
                                                 count,
                                                 collapsed = false,
                                                 className,
                                             }: CommunityUnreadBadgeProps) {
    if (count <= 0) return null;

    const label = formatBadgeCount(count);

    if (collapsed) {
        return (
            <span
                role="status"
                aria-label={`${count} unread community items`}
                className={cn(
                    "absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500",
                    "ring-2 ring-white dark:ring-gray-900",
                    className
                )}
            />
        );
    }

    return (
        <span
            role="status"
            aria-label={`${count} unread community items`}
            className={cn(
                "ml-auto inline-flex items-center justify-center",
                "h-5 min-w-5 px-1.5 rounded-full",
                "bg-red-500 text-white text-[11px] font-semibold leading-none",
                className
            )}
        >
            {label}
        </span>
    );
}
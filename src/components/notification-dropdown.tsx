"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon, CheckCheckIcon, Loader2Icon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "@/app/actions/notification";

interface Notification {
    id: string;
    type: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: Date;
}

interface NotificationDropdownProps {
    count: number;
}

const typeBadgeStyles: Record<string, string> = {
    PROJECT_STATUS: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    COMMENT: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    LIKE: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    MENTION: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    SYSTEM: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function typeLabel(type: string): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NotificationDropdown({ count }: NotificationDropdownProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [unreadCount, setUnreadCount] = useState(count);
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const data = await getNotifications(1, 10);
            setNotifications(data.notifications as Notification[]);
            setUnreadCount(data.unreadCount);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            fetchNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            router.refresh();
        } catch {
            // silently fail
        } finally {
            setMarkingAll(false);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            try {
                await markNotificationRead(notification.id);
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
                router.refresh();
            } catch {
                // silently fail
            }
        }
        setOpen(false);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Notifications"
                >
                    <BellIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Notifications
                    </h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={markingAll}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 cursor-pointer"
                        >
                            {markingAll ? (
                                <Loader2Icon className="h-3 w-3 animate-spin" />
                            ) : (
                                <CheckCheckIcon className="h-3 w-3" />
                            )}
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Notification List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2Icon className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                    ) : error ? (
                        <div className="py-8 text-center text-sm text-red-500 dark:text-red-400">
                            Failed to load notifications
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <button
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={cn(
                                    "w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0 cursor-pointer",
                                    !notification.read && "border-l-2 border-l-blue-500"
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    {!notification.read && (
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                    )}
                                    <div className={cn("flex-1 min-w-0", notification.read && "ml-4")}>
                                        <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                    typeBadgeStyles[notification.type] || typeBadgeStyles.SYSTEM
                                                )}
                                            >
                                                {typeLabel(notification.type)}
                                            </span>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                {formatDistanceToNow(new Date(notification.createdAt), {
                                                    addSuffix: true,
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-800">
                    <Link
                        href="/notifications"
                        onClick={() => setOpen(false)}
                        className="block w-full px-4 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-gray-50 dark:text-blue-400 dark:hover:bg-gray-900 transition-colors"
                    >
                        View all notifications
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}

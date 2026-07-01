"use client";

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/app/actions/notification';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    type: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: Date;
}

interface NotificationDropdownProps {
    count?: number;
}

export default function NotificationDropdown({ count: initialCount = 0 }: NotificationDropdownProps) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const router = useRouter();

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await getNotifications(1, 10);
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchNotifications();
    }, [open]);

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            router.refresh();
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        } finally {
            setMarkingAll(false);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            try {
                await markNotificationRead(notification.id);
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
                router.refresh();
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
            }
        }

        setOpen(false);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    return (
        <div className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2"
                title="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
                )}
            </button>

            {/* Content */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-semibold">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={markingAll}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                {markingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-auto">
                        {loading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No notifications yet</div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={cn(
                                        "p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer",
                                        !notif.read && "bg-blue-50 dark:bg-blue-950"
                                    )}
                                >
                                    <p className="text-sm">{notif.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t">
                        <Link href="/notifications" className="text-blue-600 text-sm block text-center">
                            View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
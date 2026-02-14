"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellIcon, CheckIcon, CheckCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notification";

interface NotificationData {
    id: string;
    type: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: Date;
}

interface NotificationsClientProps {
    initialNotifications: NotificationData[];
    unreadCount: number;
}

export default function NotificationsClient({
    initialNotifications,
    unreadCount,
}: NotificationsClientProps) {
    const router = useRouter();
    const [notifications, setNotifications] = React.useState(initialNotifications);

    const handleMarkRead = async (id: string) => {
        try {
            await markNotificationRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
        } catch {
            toast.error("Failed to mark notification as read");
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            toast.success("All notifications marked as read");
        } catch {
            toast.error("Failed to mark all as read");
        }
    };

    const handleClick = async (notification: NotificationData) => {
        if (!notification.read) {
            await handleMarkRead(notification.id);
        }
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
        <div className="space-y-4">
            {unreadCount > 0 && (
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                        <CheckCheckIcon className="h-4 w-4 mr-2" />
                        Mark all as read
                    </Button>
                </div>
            )}

            {notifications.length === 0 ? (
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                    <CardContent className="py-12 text-center">
                        <BellIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No notifications
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            You&apos;re all caught up!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                notifications.map((notification) => (
                    <Card
                        key={notification.id}
                        className={`border cursor-pointer transition-colors ${
                            notification.read
                                ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                                : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950"
                        }`}
                        onClick={() => handleClick(notification)}
                    >
                        <CardContent className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`h-2 w-2 rounded-full shrink-0 ${
                                        notification.read ? "bg-transparent" : "bg-blue-600"
                                    }`}
                                />
                                <div>
                                    <p className="text-sm text-gray-800 dark:text-gray-200">
                                        {notification.message}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="text-xs">
                                            {notification.type.replace("_", " ")}
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                            {formatDate(notification.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {!notification.read && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkRead(notification.id);
                                    }}
                                >
                                    <CheckIcon className="h-4 w-4" />
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}

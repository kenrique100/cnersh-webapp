"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    BellIcon,
    CheckIcon,
    CheckCheckIcon,
    ExternalLinkIcon,
    XIcon,
    HeartIcon,
    MessageCircleIcon,
    FolderIcon,
    AlertCircleIcon,
    InfoIcon,
} from "lucide-react";
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
    isAdmin?: boolean;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    LIKE: { icon: HeartIcon, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900", label: "Like" },
    COMMENT: { icon: MessageCircleIcon, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900", label: "Comment" },
    PROJECT_STATUS: { icon: FolderIcon, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900", label: "Project Status" },
    REVIEW_ASSIGNED: { icon: FolderIcon, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900", label: "Review Assigned" },
    SYSTEM: { icon: AlertCircleIcon, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900", label: "System" },
    MENTION: { icon: InfoIcon, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900", label: "Mention" },
};

export default function NotificationsClient({
    initialNotifications,
    unreadCount: initialUnreadCount,
    isAdmin,
}: NotificationsClientProps) {
    const router = useRouter();
    const [notifications, setNotifications] = React.useState(initialNotifications);
    const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
    const [selectedNotification, setSelectedNotification] = React.useState<NotificationData | null>(null);

    const handleMarkRead = async (id: string) => {
        try {
            await markNotificationRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            toast.error("Failed to mark notification as read");
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            toast.success("All notifications marked as read");
            router.refresh();
        } catch {
            toast.error("Failed to mark all as read");
        }
    };

    const handleClick = async (notification: NotificationData) => {
        if (!notification.read) {
            await handleMarkRead(notification.id);
        }
        // Navigate directly to the linked page if available
        if (notification.link) {
            router.push(notification.link);
        } else {
            setSelectedNotification(notification);
        }
    };

    const handleNavigate = (link: string) => {
        setSelectedNotification(null);
        router.push(link);
    };

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const getConfig = (type: string) =>
        typeConfig[type] || typeConfig.SYSTEM;

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
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardContent className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <BellIcon className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                No notifications
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                You&apos;re all caught up!
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                notifications.map((notification) => {
                    const config = getConfig(notification.type);
                    const Icon = config.icon;
                    return (
                        <Card
                            key={notification.id}
                            className={`border cursor-pointer transition-all duration-200 rounded-xl ${
                                notification.read
                                    ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-sm"
                                    : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 hover:shadow-md border-l-4 border-l-blue-500"
                            }`}
                            onClick={() => handleClick(notification)}
                        >
                            <CardContent className="py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`h-9 w-9 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm leading-relaxed ${
                                            notification.read
                                                ? "text-gray-600 dark:text-gray-400"
                                                : "text-gray-900 dark:text-gray-100 font-medium"
                                        }`}>
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge className={`${config.bg} ${config.color} text-[10px] font-medium`}>
                                                {config.label}
                                            </Badge>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatDate(notification.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {!notification.read && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkRead(notification.id);
                                        }}
                                        title="Mark as read"
                                    >
                                        <CheckIcon className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })
            )}

            {/* Notification Detail Dialog */}
            <Dialog
                open={selectedNotification !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedNotification(null);
                }}
            >
                {selectedNotification && (() => {
                    const config = getConfig(selectedNotification.type);
                    const Icon = config.icon;
                    return (
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div className={`h-8 w-8 rounded-full ${config.bg} flex items-center justify-center`}>
                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                    </div>
                                    <span>Notification Details</span>
                                </DialogTitle>
                                <DialogDescription className="sr-only">View notification details and actions</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="flex items-center gap-2">
                                    <Badge className={`${config.bg} ${config.color} text-xs`}>
                                        {config.label}
                                    </Badge>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatDate(selectedNotification.createdAt)}
                                    </span>
                                </div>

                                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                        {selectedNotification.message}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {selectedNotification.link && (
                                        <Button
                                            onClick={() => handleNavigate(selectedNotification.link!)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                            size="sm"
                                        >
                                            <ExternalLinkIcon className="h-4 w-4 mr-1.5" />
                                            {selectedNotification.type === "LIKE" || selectedNotification.type === "COMMENT"
                                                ? "View Post"
                                                : selectedNotification.type === "PROJECT_STATUS"
                                                ? "View Project"
                                                : "Go to Link"}
                                        </Button>
                                    )}

                                    {selectedNotification.type === "SYSTEM" && isAdmin && selectedNotification.link && (
                                        <Button
                                            onClick={() => handleNavigate(selectedNotification.link!)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Review Content
                                        </Button>
                                    )}

                                    {!selectedNotification.read && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleMarkRead(selectedNotification.id);
                                                setSelectedNotification({
                                                    ...selectedNotification,
                                                    read: true,
                                                });
                                            }}
                                        >
                                            <CheckIcon className="h-4 w-4 mr-1.5" />
                                            Mark as Read
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedNotification(null)}
                                    >
                                        <XIcon className="h-4 w-4 mr-1.5" />
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    );
                })()}
            </Dialog>
        </div>
    );
}

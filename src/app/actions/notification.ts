"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function getUnreadNotificationCount(): Promise<number> {
    const session = await authSession();
    if (!session) return 0;

    try {
        return await db.notification.count({
            where: { userId: session.user.id, read: false },
        });
    } catch (error) {
        console.error("Error fetching unread notification count:", error);
        return 0;
    }
}

export async function getNotifications(page: number = 1, limit: number = 20) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    try {
        const [notifications, total, unreadCount] = await Promise.all([
            db.notification.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            db.notification.count({ where: { userId: session.user.id } }),
            db.notification.count({
                where: { userId: session.user.id, read: false },
            }),
        ]);

        return { notifications, total, unreadCount, pages: Math.ceil(total / limit) };
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return { notifications: [], total: 0, unreadCount: 0, pages: 0 };
    }
}

export async function markNotificationRead(notificationId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    return db.notification.update({
        where: { id: notificationId, userId: session.user.id },
        data: { read: true },
    });
}

export async function markAllNotificationsRead() {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    return db.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
    });
}

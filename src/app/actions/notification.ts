"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function getNotifications(page: number = 1, limit: number = 20) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

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

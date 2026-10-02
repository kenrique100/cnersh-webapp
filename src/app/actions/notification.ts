"use server";

import { unstable_cache } from "next/cache";
import { revalidateTag } from "@/lib/revalidate";
import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache-tags";

export async function getUnreadNotificationCount(): Promise<number> {
    let session;
    try {
        session = await verifiedAuthSession();
    } catch {
        return 0;
    }

    const userId = session.user.id;

    const cached = unstable_cache(
        async (id: string) =>
            db.notification.count({
                where: { userId: id, read: false },
            }),
        ["unread-notification-count", userId],
        {
            tags: [CACHE_TAGS.notificationCount(userId)],
            revalidate: 30,
        },
    );

    try {
        return await cached(userId);
    } catch (error) {
        console.error("Error fetching unread notification count:", error);
        return 0;
    }
}

export async function getNotifications(page: number = 1, limit: number = 20) {
    const session = await verifiedAuthSession();

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
    const session = await verifiedAuthSession();

    const result = await db.notification.update({
        where: { id: notificationId, userId: session.user.id },
        data: { read: true },
    });

    revalidateTag(CACHE_TAGS.notificationCount(session.user.id));
    return result;
}

export async function markAllNotificationsRead() {
    const session = await verifiedAuthSession();

    const result = await db.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
    });

    revalidateTag(CACHE_TAGS.notificationCount(session.user.id));
    return result;
}
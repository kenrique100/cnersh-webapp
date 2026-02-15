import { db } from "@/lib/db";

/**
 * Sends a notification to all admin and superadmin users.
 */
export async function notifyAdmins(data: {
    type: "PROJECT_STATUS" | "COMMENT" | "LIKE" | "MENTION" | "SYSTEM";
    message: string;
    link?: string;
    excludeUserId?: string;
}) {
    const admins = await db.user.findMany({
        where: {
            role: { in: ["admin", "superadmin"] },
            banned: { not: true },
            ...(data.excludeUserId ? { id: { not: data.excludeUserId } } : {}),
        },
        select: { id: true },
    });

    if (admins.length === 0) return;

    await db.notification.createMany({
        data: admins.map((admin) => ({
            type: data.type,
            message: data.message,
            link: data.link || null,
            userId: admin.id,
        })),
    });
}

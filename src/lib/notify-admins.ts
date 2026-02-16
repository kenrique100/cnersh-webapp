import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";

/**
 * Sends a notification to all admin and superadmin users.
 * Also sends email notifications via Resend.
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
        select: { id: true, email: true, name: true },
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

    // Send email notifications to admins (non-blocking)
    for (const admin of admins) {
        sendNotificationEmail({
            to: admin.email,
            userName: admin.name || "Admin",
            notificationMessage: data.message,
            notificationType: data.type,
            actionUrl: data.link,
        }).catch((err) => console.error("Error sending admin email notification:", err));
    }
}

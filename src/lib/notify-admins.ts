import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "crypto";
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

    // Send email notifications to admins (fire-and-forget, dispatched concurrently)
    const emailPromises = admins
        .filter((a) => a.email)
        .map((admin) => {
            Sentry.startSpan(
                {
                    name: "admin-notifications",
                    op: "queue.publish",
                    attributes: {
                        "messaging.destination.name": "admin-notifications",
                        "messaging.message.id": randomUUID(),
                        "messaging.message.body.size": data.message.length,
                    },
                },
                () => {
                    // Return the promise so we can track it
                    return sendNotificationEmail({
                        to: admin.email,
                        userName: admin.name || "Admin",
                        notificationMessage: data.message,
                        notificationType: data.type,
                        actionUrl: data.link,
                    }).catch((err) => console.error("Error sending admin email notification:", err));
                }
            );
            return sendNotificationEmail({
                to: admin.email,
                userName: admin.name || "Admin",
                notificationMessage: data.message,
                notificationType: data.type,
                actionUrl: data.link,
            }).catch((err) => console.error("Error sending admin email notification:", err));
        });

    // Dispatch concurrently without blocking the caller
    void Promise.allSettled(emailPromises);
}
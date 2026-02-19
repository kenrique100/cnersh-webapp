"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";

export async function submitSupportMessage(message: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    if (!message || message.trim().length === 0) {
        throw new Error("Message cannot be empty");
    }

    const trimmedMessage = message.trim();

    // Find all super admins to notify
    const superAdmins = await db.user.findMany({
        where: {
            role: "superadmin",
            banned: { not: true },
        },
        select: { id: true, email: true, name: true },
    });

    if (superAdmins.length === 0) {
        throw new Error("No super admin available to receive your message");
    }

    // Create notifications for all super admins
    await db.notification.createMany({
        data: superAdmins.map((admin) => ({
            type: "SYSTEM" as const,
            message: `Support message from ${session.user.name || session.user.email}: "${trimmedMessage.substring(0, 200)}${trimmedMessage.length > 200 ? "..." : ""}"`,
            link: `/admin/reports`,
            userId: admin.id,
        })),
    });

    // Send email to super admins (non-blocking)
    for (const admin of superAdmins) {
        sendNotificationEmail({
            to: admin.email,
            userName: admin.name || "Super Admin",
            notificationMessage: `Support message from ${session.user.name || session.user.email}: "${trimmedMessage}"`,
            notificationType: "SYSTEM",
            actionUrl: `/admin/reports`,
        }).catch((err) => console.error("Error sending support message email:", err));
    }

    return { success: true };
}

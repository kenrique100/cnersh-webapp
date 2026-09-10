"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { sanitizeText } from "@/lib/sanitize";
import { z } from "zod";

export async function submitSupportMessage(message: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    if (!message || message.trim().length === 0) {
        throw new Error("Message cannot be empty");
    }
    const parsed = z.string().trim().max(5_000).safeParse(message);
    if (!parsed.success) throw new Error("Message must be 5000 characters or fewer");

    const trimmedMessage = sanitizeText(parsed.data).trim();
    if (!trimmedMessage) throw new Error("Message cannot be empty");

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

    // Send email to super admins (dispatched concurrently)
    const emailPromises = superAdmins
        .filter((a) => a.email)
        .map((admin) =>
            sendNotificationEmail({
                to: admin.email,
                userName: admin.name || "Super Admin",
                notificationMessage: `Support message from ${session.user.name || session.user.email}: "${trimmedMessage}"`,
                notificationType: "SYSTEM",
                actionUrl: `/admin/reports`,
            }).catch((err) => console.error("Error sending support message email:", err))
        );

    void Promise.allSettled(emailPromises);

    return { success: true };
}

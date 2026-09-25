"use server";

import * as Sentry from "@sentry/nextjs";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { sanitizeText } from "@/lib/sanitize";
import { supportSchema, type SupportInput } from "@/lib/support-schema";

export async function submitSupportMessage(input: SupportInput) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const parsed = supportSchema.safeParse(input);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(first?.message ?? "Invalid form data");
    }

    const { category, pageUrl } = parsed.data;
    const subject = sanitizeText(parsed.data.subject).trim();
    const message = sanitizeText(parsed.data.message).trim();

    if (!subject) throw new Error("Subject cannot be empty");
    if (!message) throw new Error("Message cannot be empty");

    const userName = session.user.name || session.user.email || "Unknown user";
    const userEmail = session.user.email || "unknown@local";

    // 1) Send to Sentry so the team can triage even if the DB write later fails.
    Sentry.captureMessage(`[Support] ${category}: ${subject}`, {
        level: "info",
        user: {
            id: session.user.id,
            email: userEmail,
            username: userName,
        },
        tags: {
            category,
            source: "support-form",
        },
        extra: {
            message,
            pageUrl,
            submittedAt: new Date().toISOString(),
        },
    });

    // 2) Find all active super admins.
    const superAdmins = await db.user.findMany({
        where: { role: "superadmin", banned: { not: true } },
        select: { id: true, email: true, name: true },
    });

    if (superAdmins.length === 0) {
        throw new Error("No super admin available to receive your message");
    }

    const preview = message.length > 200 ? `${message.substring(0, 200)}...` : message;
    const notificationMessage = `[${category.toUpperCase()}] ${subject} — ${preview}`;

    // 3) Create in-app notifications.
    await db.notification.createMany({
        data: superAdmins.map((admin) => ({
            type: "SYSTEM" as const,
            message: notificationMessage,
            link: `/admin/reports`,
            userId: admin.id,
        })),
    });

    // 4) Fire off emails in parallel; failure to email should not block the response.
    const emailPromises = superAdmins
        .filter((a) => a.email)
        .map((admin) =>
            sendNotificationEmail({
                to: admin.email,
                userName: admin.name || "Super Admin",
                notificationMessage:
                    `From: ${userName} <${userEmail}>\n` +
                    `Category: ${category}\n` +
                    `Subject: ${subject}\n` +
                    `Page: ${pageUrl ?? "unknown"}\n\n` +
                    `${message}`,
                notificationType: "SYSTEM",
                actionUrl: `/admin/reports`,
            }).catch((err) =>
                console.error("[support] email dispatch failed:", err),
            ),
        );

    void Promise.allSettled(emailPromises);

    return { success: true };
}
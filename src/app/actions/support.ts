"use server";

import * as Sentry from "@sentry/nextjs";
import { verifiedAuthSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import { sanitizeText } from "@/lib/sanitize";
import { supportSchema, type SupportInput } from "@/lib/support-schema";
import { activeUserWithRoleFilter } from "@/lib/user-filters";

/**
 * Hard-coded delivery target for the support form. This guarantees that
 * user messages reach a human even if no superadmin row is active.
 */
const DEVELOPER_EMAIL = "kenriqueanyere@gmail.com";
const DEVELOPER_NAME = "CNERSH Developer";

export type SupportResult =
    | { success: true }
    | { success: false; error: string };

export async function submitSupportMessage(
    input: SupportInput
): Promise<SupportResult> {
    const session = await verifiedAuthSession();

    const parsed = supportSchema.safeParse(input);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return { success: false, error: first?.message ?? "Invalid form data" };
    }

    const { category, pageUrl } = parsed.data;
    const subject = sanitizeText(parsed.data.subject).trim();
    const message = sanitizeText(parsed.data.message).trim();

    if (!subject) return { success: false, error: "Subject cannot be empty" };
    if (!message) return { success: false, error: "Message cannot be empty" };

    const userName = session.user.name || session.user.email || "Unknown user";
    const userEmail = session.user.email || "unknown@local";

    // 1) Always record in Sentry first so the team can triage even if
    //    downstream email/DB work fails.
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

    const preview =
        message.length > 200 ? `${message.substring(0, 200)}...` : message;
    const notificationMessage = `[${category.toUpperCase()}] ${subject} — ${preview}`;
    const emailBody =
        `From: ${userName} <${userEmail}>\n` +
        `Category: ${category}\n` +
        `Subject: ${subject}\n` +
        `Page: ${pageUrl ?? "unknown"}\n\n` +
        `${message}`;

    let superAdmins: { id: string; email: string | null; name: string | null }[] = [];
    try {
        superAdmins = await db.user.findMany({
            where: activeUserWithRoleFilter("superadmin"),
            select: { id: true, email: true, name: true },
        });
    } catch (err) {
        console.error("[support] superadmin lookup failed:", err);
    }

    // 3) Build recipient list. Developer is always included.
    const recipients: { email: string; name: string }[] = [
        { email: DEVELOPER_EMAIL, name: DEVELOPER_NAME },
    ];
    for (const admin of superAdmins) {
        if (admin.email && admin.email !== DEVELOPER_EMAIL) {
            recipients.push({
                email: admin.email,
                name: admin.name || "Super Admin",
            });
        }
    }

    // 4) In-app notifications for superadmins only (skipped if none).
    if (superAdmins.length > 0) {
        try {
            await db.notification.createMany({
                data: superAdmins.map((admin) => ({
                    type: "SYSTEM" as const,
                    message: notificationMessage,
                    link: "/admin/reports",
                    userId: admin.id,
                })),
            });
        } catch (err) {
            console.error("[support] notification createMany failed:", err);
        }
    }

    const emailPromises = recipients.map((r) =>
        sendNotificationEmail({
            to: r.email,
            userName: r.name,
            notificationMessage: emailBody,
            notificationType: "SYSTEM",
            actionUrl: "/admin/reports",
        }).catch((err) =>
            console.error("[support] email dispatch failed:", err)
        )
    );
    void Promise.allSettled(emailPromises);

    return { success: true };
}
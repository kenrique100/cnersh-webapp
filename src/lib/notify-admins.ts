import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";
import ProtocolRenewalReminder from "@/emails/protocol-renewal-reminder";

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

    const emailPromises = admins
        .filter((admin): admin is typeof admin & { email: string } => !!admin.email)
        .map((admin) =>
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
                () =>
                    sendNotificationEmail({
                        to: admin.email,
                        userName: admin.name || "Admin",
                        notificationMessage: data.message,
                        notificationType: data.type,
                        actionUrl: data.link,
                    }).catch((err) =>
                        console.error("Error sending admin email notification:", err)
                    )
            )
        );

    void Promise.allSettled(emailPromises);
}

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

const EMAIL_FROM =
    process.env.EMAIL_FROM || "CNERSH <no-reply@cnersh.org>";

export async function notifyOwnerRenewalDue(protocol: {
    id: string;
    title: string;
    expiresAt: Date;
    owner: { id: string; email: string; name: string | null };
}) {
    const resubmitUrl = `${APP_URL}/protocols/${protocol.id}`;
    const expiresLabel = protocol.expiresAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // In-app notification
    try {
        await db.notification.create({
            data: {
                type: "SYSTEM",
                message: `Your protocol "${protocol.title}" expires on ${expiresLabel}. Please renew it to continue.`,
                link: `/protocols/${protocol.id}`,
                userId: protocol.owner.id,
            },
        });
    } catch (err) {
        console.error("[notifyOwnerRenewalDue] failed to create in-app notification:", err);
    }

    if (!resend) {
        console.error("[notifyOwnerRenewalDue] RESEND_API_KEY is not configured");
        return;
    }

    try {
        await resend.emails.send({
            from: EMAIL_FROM,
            to: protocol.owner.email,
            subject: `Renewal reminder: "${protocol.title}" expires on ${expiresLabel}`,
            react: ProtocolRenewalReminder({
                ownerName: protocol.owner.name || "Researcher",
                protocolTitle: protocol.title,
                expiresAt: protocol.expiresAt,
                resubmitUrl,
            }),
        });
    } catch (err) {
        console.error("[notifyOwnerRenewalDue] failed to send email:", err);
        Sentry.captureException(err, {
            tags: { notification: "protocol-renewal-reminder" },
            extra: { projectId: protocol.id, userId: protocol.owner.id },
        });
        throw err;
    }
}
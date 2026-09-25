import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/send-notification-email";

export type CommunityActivityType = "NEW_TOPIC" | "NEW_REPLY" | "ANNOUNCEMENT";

export interface CommunityActivityPayload {
    type: CommunityActivityType;
    actor: { id: string; name: string | null };
    topic: { id: string; title: string; category?: string };
    preview: string;
}

const ACTIVITY_LABEL: Record<CommunityActivityType, string> = {
    NEW_TOPIC: "New Topic",
    NEW_REPLY: "New Reply",
    ANNOUNCEMENT: "Announcement",
};

const NOTIFICATION_TYPE_MAP: Record<
    CommunityActivityType,
    "COMMENT" | "ANNOUNCEMENT"
> = {
    NEW_TOPIC: "COMMENT",
    NEW_REPLY: "COMMENT",
    ANNOUNCEMENT: "ANNOUNCEMENT",
};

const PREVIEW_MAX = 180;

function truncatePreview(text: string): string {
    const collapsed = text.replace(/\s+/g, " ").trim();
    return collapsed.length <= PREVIEW_MAX
        ? collapsed
        : `${collapsed.slice(0, PREVIEW_MAX - 1)}…`;
}

export async function notifyCommunityActivity(
    activity: CommunityActivityPayload
): Promise<void> {
    const label = ACTIVITY_LABEL[activity.type];
    const actorName = activity.actor.name?.trim() || "An administrator";
    const preview = truncatePreview(activity.preview);
    const topicUrl = `/community?topic=${activity.topic.id}`;

    const inAppMessage = `${actorName} • ${label}: "${activity.topic.title}"`;
    const emailMessage = `${actorName} posted a ${label.toLowerCase()}: "${activity.topic.title}"`;

    let recipients: Array<{ id: string; email: string | null; name: string | null }> = [];
    try {
        recipients = await db.user.findMany({
            where: {
                role: { in: ["admin", "superadmin"] },
                banned: { not: true },
                id: { not: activity.actor.id },
            },
            select: { id: true, email: true, name: true },
        });
    } catch (error) {
        console.error("[community-notifications] failed to load recipients:", error);
        return;
    }

    if (recipients.length === 0) return;

    try {
        await db.notification.createMany({
            data: recipients.map((r) => ({
                type: NOTIFICATION_TYPE_MAP[activity.type],
                message: inAppMessage,
                link: topicUrl,
                userId: r.id,
            })),
        });
    } catch (error) {
        console.error(
            "[community-notifications] failed to create in-app notifications:",
            error
        );
    }

    const emailJobs = recipients
        .filter((r): r is typeof r & { email: string } => Boolean(r.email))
        .map((r) =>
            sendNotificationEmail({
                to: r.email,
                userName: r.name || "Administrator",
                notificationMessage: emailMessage,
                notificationType: NOTIFICATION_TYPE_MAP[activity.type],
                actionUrl: topicUrl,
                communityActivity: {
                    activityType: label,
                    actorName,
                    topicTitle: activity.topic.title,
                    contentPreview: preview,
                },
            }).catch((err) =>
                console.error("[community-notifications] failed to send email:", err)
            )
        );

    void Promise.allSettled(emailJobs);
}
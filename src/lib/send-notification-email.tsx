import NotificationEmail from "@/emails/notification-email";
import { getResend, getEmailFrom } from "@/lib/email-config";

type SendNotificationEmailProps = {
    to: string;
    userName: string;
    notificationMessage: string;
    notificationType: string;
    actionUrl?: string;
};

export async function sendNotificationEmail({
    to,
    userName,
    notificationMessage,
    notificationType,
    actionUrl,
}: SendNotificationEmailProps) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn("Resend API key not configured, skipping email notification");
            return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "";
        const fullActionUrl = actionUrl && baseUrl ? `${baseUrl}${actionUrl}` : undefined;

        await getResend().emails.send({
            from: getEmailFrom(),
            to,
            subject: `CNERSH Notification: ${notificationType.replace(/_/g, " ")}`,
            react: (
                <NotificationEmail
                    userName={userName}
                    notificationMessage={notificationMessage}
                    notificationType={notificationType}
                    actionUrl={fullActionUrl}
                />
            ),
        });
    } catch (error) {
        console.error("Error sending notification email:", error);
    }
}

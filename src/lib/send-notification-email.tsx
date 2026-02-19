import { Resend } from "resend";
import NotificationEmail from "@/emails/notification-email";

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";

let resend: Resend | null = null;
function getResend() {
    if (!resend) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
    return resend;
}

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
            console.warn("Resend API key not configured. Set RESEND_API_KEY environment variable to enable email notifications.");
            return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "";
        const fullActionUrl = actionUrl && baseUrl ? `${baseUrl}${actionUrl}` : undefined;

        await getResend().emails.send({
            from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
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

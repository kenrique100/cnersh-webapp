import RequestPasswordEmail from "@/emails/request-password-email";
import { Resend } from "resend";

let resend: Resend | null = null;
function getResend() {
    if (!resend) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
    return resend;
}

type EmailProps = {
    to: string;
    subject: string;
    url: string;
};

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";

export const sendResetPasswordEmail = async ({
                                                 to,
                                                 url,
                                                 subject,
                                             }: EmailProps) => {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn("Resend API key not configured, skipping password reset email");
            return;
        }

        const emailFrom = process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM;

        await getResend().emails.send({
            from: emailFrom,
            to,
            subject,
            react: <RequestPasswordEmail url={url} to={to} />,
        });
    } catch (error) {
        console.error("Error sending reset password email:", error);
    }
};
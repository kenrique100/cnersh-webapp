import RequestPasswordEmail from "@/emails/request-password-email";
import { getResend, getEmailFrom } from "@/lib/email-config";

type EmailProps = {
    to: string;
    subject: string;
    url: string;
};

export const sendResetPasswordEmail = async ({
                                                 to,
                                                 url,
                                                 subject,
                                             }: EmailProps) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn("Resend API key not configured, skipping password reset email");
        return;
    }

    await getResend().emails.send({
        from: getEmailFrom(),
        to,
        subject,
        react: <RequestPasswordEmail url={url} to={to} />,
    });
};
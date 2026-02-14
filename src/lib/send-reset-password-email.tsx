import RequestPasswordEmail from "@/emails/request-password-email";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to,
            subject,
            react: <RequestPasswordEmail url={url} to={to} />,
        });
    } catch (error) {
        // Log the full error for debugging
        console.error("Failed to send reset password email:", error);
        throw new Error("Failed to send reset password email. Please check your email configuration and try again.");
    }
};
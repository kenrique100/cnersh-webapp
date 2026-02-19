import { Resend } from "resend";
import VerificationEmail from "@/emails/verification-email";

let resend: Resend | null = null;
function getResend() {
    if (!resend) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
    return resend;
}

type EmailProps = {
    to: string;
    verificationUrl: string;
    userName: string;
};

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";

export const sendVerificationEmail = async ({
                                                to,
                                                verificationUrl,
                                                userName,
                                            }: EmailProps) => {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn("Resend API key not configured, skipping verification email");
            return;
        }

        const emailFrom = process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM;

        await getResend().emails.send({
            from: emailFrom,
            to,
            subject: 'Welcome to Cameroon National Ethics Community - CNERSH',
            react: (
                <VerificationEmail verificationUrl={verificationUrl} userName={userName} />
            ),
        });
    } catch (error) {
        console.error("Error sending verification email:", error);
    }
}
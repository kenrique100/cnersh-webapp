import { Resend } from "resend";
import VerificationEmail from "@/emails/verification-email";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailProps = {
    to: string;
    verificationUrl: string;
    userName: string;
};

export const sendVerificationEmail = async ({
                                                to,
                                                verificationUrl,
                                                userName,
                                            }: EmailProps) => {
    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to,
            subject: 'Welcome to Cameroon National Ethics Community - CNEC',
            react: (
                <VerificationEmail verificationUrl={verificationUrl} userName={userName} />
            ),
        });
    } catch (error) {
        // Log the full error for debugging
        console.error("Failed to send verification email:", error);
        throw new Error("Failed to send verification email. Please check your email configuration and try again.");
    }
}
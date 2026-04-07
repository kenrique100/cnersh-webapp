import { Resend } from "resend";
import VerificationEmail from "@/emails/verification-email";

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";

let resend: Resend | null = null;
function getResend() {
    if (!resend) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error("RESEND_API_KEY environment variable is not set. Please configure it in your .env file.");
        }
        resend = new Resend(apiKey);
    }
    return resend;
}

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
        // Validate email address
        if (!to || !to.includes('@')) {
            throw new Error(`Invalid email address: ${to}`);
        }

        // Validate environment configuration
        if (!process.env.RESEND_API_KEY) {
            console.error("❌ RESEND_API_KEY is not configured. Please add it to your .env file.");
            throw new Error("Email service not configured. Please contact support.");
        }

        console.log(`📧 Sending verification email to: ${to}`);

        const response = await getResend().emails.send({
            from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
            to,
            subject: 'Welcome to Cameroon National Ethics Community - CNERSH',
            react: (
                <VerificationEmail verificationUrl={verificationUrl} userName={userName} />
            ),
        });

        if (response.error) {
            console.error("❌ Resend API error:", response.error);
            throw new Error(`Failed to send email: ${response.error.message}`);
        }

        console.log(`✅ Verification email sent successfully to ${to}. Email ID: ${response.data?.id}`);
        return response;
    } catch (error) {
        console.error("❌ Error in sendVerificationEmail:", error);

        // Log detailed error for debugging
        if (error instanceof Error) {
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                to,
                userName
            });
        }

        throw error;
    }
}
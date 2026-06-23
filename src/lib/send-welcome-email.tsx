// lib/send-welcome-email.tsx
import { Resend } from "resend";
import WelcomeEmail from "@/emails/welcome-email";   // ← This should now resolve

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";

let resend: Resend | null = null;

function getResend() {
    if (!resend) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error("RESEND_API_KEY environment variable is not set.");
        }
        resend = new Resend(apiKey);
    }
    return resend;
}

type SendWelcomeEmailProps = {
    to: string;
    userName: string;
};

export const sendWelcomeEmail = async ({ to, userName }: SendWelcomeEmailProps) => {
    try {
        if (!to || !to.includes("@")) {
            throw new Error(`Invalid email address: ${to}`);
        }

        console.log(`Sending welcome email to: ${to}`);

        const response = await getResend().emails.send({
            from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
            to,
            subject: "Welcome to CNERSH – Your Account is Ready!",
            react: <WelcomeEmail userName={userName} />,
        });

        if (response.error) {
            console.error("Resend API error:", response.error);
            throw new Error(`Failed to send welcome email: ${response.error.message}`);
        }

        console.log(`Welcome email sent to ${to}. ID: ${response.data?.id}`);
        return response;
    } catch (error) {
        console.error("Error in sendWelcomeEmail:", error);
        throw error;
    }
};
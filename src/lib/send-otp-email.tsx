import OtpEmail from "@/emails/otp-email";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailProps = {
    to: string;
    otp: string;
};

export const sendOtpEmail = async ({ to, otp }: EmailProps) => {
    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to,
            subject: "Your login code",
            react: <OtpEmail otp={otp} />,
        });
    } catch (error) {
        console.error("Failed to send OTP email:", error);
        // Log the full error for debugging but throw a generic message to users
        if (error instanceof Error) {
            console.error("Error details:", error.message, error.stack);
        }
        throw new Error("Failed to send OTP email. Please check your email configuration and try again.");
    }
};
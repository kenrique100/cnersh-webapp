import OtpEmail from "@/emails/otp-email";
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
    otp: string;
};

export const sendOtpEmail = async ({ to, otp }: EmailProps) => {
    try {
        await getResend().emails.send({
            from: process.env.EMAIL_FROM!,
            to,
            subject: "Your login code",
            react: <OtpEmail otp={otp} />,
        });
    } catch (error) {
        console.error("Failed to send OTP email:", error);
        throw new Error("Failed to send OTP email. Please try again.");
    }
};
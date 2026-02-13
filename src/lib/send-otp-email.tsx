import OtpEmail from "@/emails/otp-email";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailProps = {
    to: string;
    otp: string;
};

export const sendOtpEmail = async ({ to, otp }: EmailProps) => {
    await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to,
        subject: "Your login code",
        react: <OtpEmail otp={otp} />,
    });
};
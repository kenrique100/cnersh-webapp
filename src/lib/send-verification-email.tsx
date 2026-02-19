import { Resend } from "resend";
import VerificationEmail from "@/emails/verification-email";

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";

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

export const sendVerificationEmail = async ({
                                                to,
                                                verificationUrl,
                                                userName,
                                            }: EmailProps) => {
    await getResend().emails.send({
        from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
        to,
        subject: 'Welcome to Cameroon National Ethics Community - CNERSH',
        react: (
            <VerificationEmail verificationUrl={verificationUrl} userName={userName} />
        ),
    });
}
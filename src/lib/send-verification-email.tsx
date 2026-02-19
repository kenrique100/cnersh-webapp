import VerificationEmail from "@/emails/verification-email";
import { getResend, getEmailFrom } from "@/lib/email-config";

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
    if (!process.env.RESEND_API_KEY) {
        console.warn("Resend API key not configured, skipping verification email");
        return;
    }

    await getResend().emails.send({
        from: getEmailFrom(),
        to,
        subject: 'Welcome to Cameroon National Ethics Community - CNERSH',
        react: (
            <VerificationEmail verificationUrl={verificationUrl} userName={userName} />
        ),
    });
}
import RequestPasswordEmail from "@/emails/request-password-email";
import { Resend } from "resend";

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
    subject: string;
    url: string;
};

export const sendResetPasswordEmail = async ({
                                                 to,
                                                 url,
                                                 subject,
                                             }: EmailProps) => {
    await getResend().emails.send({
        from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
        to,
        subject,
        react: <RequestPasswordEmail url={url} to={to} />,
    });
};
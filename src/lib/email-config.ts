import { Resend } from "resend";

export const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";

let resend: Resend | null = null;

export function getResend() {
    if (!resend) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
    return resend;
}

export function getEmailFrom() {
    return process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM;
}

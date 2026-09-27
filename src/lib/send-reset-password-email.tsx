import RequestPasswordEmail from "@/emails/request-password-email";
import { Resend } from "resend";

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";
const isProd = process.env.NODE_ENV === "production";

/**
 * Removes a known secret (e.g. a password reset URL containing a token)
 * from any text before it is written to logs. Applied to error messages,
 * stacks, and SDK-returned error text.
 */
function redact(text: string, secret: string): string {
    if (!text || !secret) return text;
    return text.split(secret).join("[REDACTED_URL]");
}

let resend: Resend | null = null;
function getResend() {
    if (!resend) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error(
                "RESEND_API_KEY environment variable is not set. Please configure it in your .env file."
            );
        }
        resend = new Resend(apiKey);
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
    try {
        // Validate email address without echoing it back into the error.
        if (!to || !to.includes("@")) {
            throw new Error("Invalid recipient email address");
        }

        // Validate environment configuration.
        if (!process.env.RESEND_API_KEY) {
            console.error(
                "[sendResetPasswordEmail] RESEND_API_KEY is not configured"
            );
            throw new Error("Email service not configured. Please contact support.");
        }

        if (!isProd) {
            console.log(`Sending password reset email to: ${to}`);
        }

        const response = await getResend().emails.send({
            from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
            to,
            subject,
            react: <RequestPasswordEmail url={url} to={to} />,
        });

        if (response.error) {
            // Resend may echo parts of the request back; scrub the reset URL.
            const safeResendError = redact(
                response.error.message ?? "unknown error",
                url
            );
            console.error(
                "[sendResetPasswordEmail] Resend API error:",
                safeResendError
            );
            throw new Error("Failed to send email");
        }

        if (!isProd) {
            console.log(
                `Password reset email sent successfully to ${to}. Email ID: ${response.data?.id}`
            );
        }
        return response;
    } catch (error) {
        // Never log a message that can contain the reset token.
        const rawMessage =
            error instanceof Error ? error.message : "Unknown error";
        const safeMessage = redact(rawMessage, url);
        console.error("[sendResetPasswordEmail] failed:", safeMessage);

        if (error instanceof Error && !isProd) {
            // Verbose context is dev-only and still redacted.
            console.error("Error details:", {
                message: safeMessage,
                stack: error.stack ? redact(error.stack, url) : undefined,
                to,
                // url intentionally omitted — contains a reset token
            });
        }

        throw error;
    }
};
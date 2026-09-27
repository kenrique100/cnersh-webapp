import { Resend } from "resend";
import VerificationEmail from "@/emails/verification-email";

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";
const isProd = process.env.NODE_ENV === "production";

/**
 * Removes a known secret (e.g. a verification URL containing a token)
 * from any text before it is written to logs.
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
    verificationUrl: string;
    userName: string;
};

export const sendVerificationEmail = async ({
                                                to,
                                                verificationUrl,
                                                userName,
                                            }: EmailProps) => {
    try {
        // Validate email address without echoing it back into the error.
        if (!to || !to.includes("@")) {
            throw new Error("Invalid recipient email address");
        }

        if (!isProd) {
            console.log(`Sending verification email to: ${to}`);
        }

        const response = await getResend().emails.send({
            from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
            to,
            subject: "Welcome to Cameroon National Ethics Community - CNERSH",
            react: (
                <VerificationEmail
                    verificationUrl={verificationUrl}
                    userName={userName}
                />
            ),
        });

        if (response.error) {
            // Resend may echo parts of the request back; scrub the verification URL.
            const safeResendError = redact(
                response.error.message ?? "unknown error",
                verificationUrl
            );
            console.error(
                "[sendVerificationEmail] Resend API error:",
                safeResendError
            );
            throw new Error("Failed to send email");
        }

        if (!isProd) {
            console.log(
                `Verification email sent successfully to ${to}. Email ID: ${response.data?.id}`
            );
        }
        return response;
    } catch (error) {
        // Never log a message that can contain the verification token.
        const rawMessage =
            error instanceof Error ? error.message : "Unknown error";
        const safeMessage = redact(rawMessage, verificationUrl);
        console.error("[sendVerificationEmail] failed:", safeMessage);

        if (error instanceof Error && !isProd) {
            // Verbose context is dev-only and still redacted.
            console.error("Error details:", {
                message: safeMessage,
                stack: error.stack
                    ? redact(error.stack, verificationUrl)
                    : undefined,
                to,
                userName,
            });
        }

        throw error;
    }
};
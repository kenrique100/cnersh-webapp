import { Resend } from "resend";
import WelcomeEmail from "@/emails/welcome-email";

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";
const isProd = process.env.NODE_ENV === "production";
const log = (...args: unknown[]) => { if (!isProd) console.log(...args); };
const warn = (...args: unknown[]) => { if (!isProd) console.warn(...args); };

let resend: Resend | null = null;
function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY environment variable is not set.");
    resend = new Resend(apiKey);
  }
  return resend;
}

type SendWelcomeEmailProps = { to: string; userName: string };

export const sendWelcomeEmail = async ({ to, userName }: SendWelcomeEmailProps) => {
  if (!to || !to.includes("@")) throw new Error(`Invalid email address`);
  log("Sending welcome email");
  const response = await getResend().emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
    to,
    subject: "Welcome to CNERSH – Your Account is Ready!",
    react: <WelcomeEmail userName={userName} />,
  });
  if (response.error) {
    warn("Resend API error");
    throw new Error("Failed to send welcome email");
  }
  log("Welcome email sent successfully");
  return response;
};
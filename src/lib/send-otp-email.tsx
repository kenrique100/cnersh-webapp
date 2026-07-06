import crypto from "crypto";
import { Resend } from "resend";
import { OTPEmail } from "@/emails/otp-email";

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

type OtpRecord = { code: string; expiresAt: number; attempts: number };
const otpStore = new Map<string, OtpRecord>();

let resend: Resend | null = null;
function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY environment variable is not set.");
    resend = new Resend(apiKey);
  }
  return resend;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isProd = process.env.NODE_ENV === "production";
const log = (...args: unknown[]) => { if (!isProd) console.log(...args); };
const warn = (...args: unknown[]) => { if (!isProd) console.warn(...args); };

export type OTPEmailProps = { to: string; otpCode: string; userName?: string; expiresInMinutes?: number };

export function generateOTP(length: number = 6): string {
  const digits = "0123456789";
  const maxUnbiased = Math.floor(256 / digits.length) * digits.length;
  let otp = "";
  while (otp.length < length) {
    const randomByte = crypto.randomBytes(1)[0];
    if (randomByte < maxUnbiased) otp += digits[randomByte % digits.length];
  }
  return otp;
}

export const sendOTPEmail = async ({ to, otpCode, userName, expiresInMinutes = 10 }: OTPEmailProps) => {
  if (!to || !to.includes("@")) throw new Error("Invalid email address");
  if (!otpCode || otpCode.length < 4) throw new Error("Invalid OTP code");
  if (!process.env.RESEND_API_KEY) throw new Error("Email service not configured. Please contact support.");

  log("Sending OTP email");
  const response = await getResend().emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
    to,
    subject: "Your CNERSH Verification Code",
    react: <OTPEmail otpCode={otpCode} userName={userName} expiresInMinutes={expiresInMinutes} />,
  });

  if (response.error) {
    warn("Resend API error");
    throw new Error("Failed to send OTP email");
  }

  log("OTP email sent successfully");
  return response;
};

export function storeOTP(email: string, otpCode: string, expiresInMinutes: number = 10): void {
  const normalized = normalizeEmail(email);
  otpStore.set(normalized, { code: otpCode, expiresAt: Date.now() + expiresInMinutes * 60 * 1000, attempts: 0 });
}

export function verifyOTP(email: string, otpCode: string): { valid: boolean; message: string } {
  const normalized = normalizeEmail(email);
  const stored = otpStore.get(normalized);
  if (!stored) return { valid: false, message: "No OTP found. Please request a new code." };
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(normalized);
    return { valid: false, message: "OTP has expired. Please request a new code." };
  }
  if (stored.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(normalized);
    return { valid: false, message: "Too many failed attempts. Please request a new code." };
  }
  if (stored.code !== otpCode) {
    stored.attempts += 1;
    otpStore.set(normalized, stored);
    return { valid: false, message: `Invalid code. ${MAX_OTP_ATTEMPTS - stored.attempts} attempts remaining.` };
  }
  otpStore.delete(normalized);
  return { valid: true, message: "OTP verified successfully" };
}

export function clearExpiredOTPs(): void {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) if (now > data.expiresAt) otpStore.delete(email);
}

if (typeof window === "undefined") {
  setInterval(clearExpiredOTPs, 5 * 60 * 1000);
}

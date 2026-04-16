import crypto from 'crypto';
import { Resend } from "resend";
import { OTPEmail } from "@/emails/otp-email";

const DEFAULT_EMAIL_FROM = "CNERSH <info@cameroon-national-ethics-com.net>";

let resend: Resend | null = null;
function getResend() {
    if (!resend) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error("RESEND_API_KEY environment variable is not set. Please configure it in your .env file.");
        }
        resend = new Resend(apiKey);
    }
    return resend;
}

type OTPEmailProps = {
    to: string;
    otpCode: string;
    userName?: string;
    expiresInMinutes?: number;
};

/**
 * Generate a secure OTP code
 */
export function generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';

    // Use Node.js crypto for secure random number generation (server-side only)
    for (let i = 0; i < length; i++) {
        const randomByte = crypto.randomBytes(1)[0];
        otp += digits[randomByte % digits.length];
    }

    return otp;
}

/**
 * Send OTP email for authentication
 */
export const sendOTPEmail = async ({
                                        to,
                                        otpCode,
                                        userName,
                                        expiresInMinutes = 10,
                                    }: OTPEmailProps) => {
    try {
        // Validate email address
        if (!to || !to.includes('@')) {
            throw new Error(`Invalid email address: ${to}`);
        }

        // Validate OTP code
        if (!otpCode || otpCode.length < 4) {
            throw new Error('Invalid OTP code');
        }

        // Validate environment configuration
        if (!process.env.RESEND_API_KEY) {
            console.error("❌ RESEND_API_KEY is not configured. Please add it to your .env file.");
            throw new Error("Email service not configured. Please contact support.");
        }

        console.log(`📧 Sending OTP email to: ${to}`);

        const response = await getResend().emails.send({
            from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
            to,
            subject: 'Your CNERSH Verification Code',
            react: (
                <OTPEmail
                    otpCode={otpCode}
                    userName={userName}
                    expiresInMinutes={expiresInMinutes}
                />
            ),
        });

        if (response.error) {
            console.error("❌ Resend API error:", response.error);
            throw new Error(`Failed to send OTP email: ${response.error.message}`);
        }

        console.log(`✅ OTP email sent successfully to ${to}. Email ID: ${response.data?.id}`);
        return response;
    } catch (error) {
        console.error("❌ Error in sendOTPEmail:", error);

        // Log detailed error for debugging
        if (error instanceof Error) {
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                to,
                userName
            });
        }

        throw error;
    }
};

/**
 * Store OTP in memory (for development)
 * In production, use Redis or database
 */
const otpStore = new Map<string, { code: string; expiresAt: Date; attempts: number }>();

/**
 * Store OTP for a user
 */
export function storeOTP(email: string, otpCode: string, expiresInMinutes: number = 10): void {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    otpStore.set(email.toLowerCase(), {
        code: otpCode,
        expiresAt,
        attempts: 0
    });

    console.log(`🔐 OTP stored for ${email}, expires at ${expiresAt.toISOString()}`);
}

/**
 * Verify OTP for a user
 */
export function verifyOTP(email: string, otpCode: string): { valid: boolean; message: string } {
    const stored = otpStore.get(email.toLowerCase());

    if (!stored) {
        return { valid: false, message: 'No OTP found. Please request a new code.' };
    }

    // Check if expired
    if (new Date() > stored.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return { valid: false, message: 'OTP has expired. Please request a new code.' };
    }

    // Check attempts (max 5)
    if (stored.attempts >= 5) {
        otpStore.delete(email.toLowerCase());
        return { valid: false, message: 'Too many failed attempts. Please request a new code.' };
    }

    // Verify code
    if (stored.code !== otpCode) {
        stored.attempts++;
        otpStore.set(email.toLowerCase(), stored);
        return { valid: false, message: `Invalid code. ${5 - stored.attempts} attempts remaining.` };
    }

    // Success - remove OTP
    otpStore.delete(email.toLowerCase());
    console.log(`✅ OTP verified successfully for ${email}`);
    return { valid: true, message: 'OTP verified successfully' };
}

/**
 * Clear expired OTPs (call periodically)
 */
export function clearExpiredOTPs(): void {
    const now = new Date();
    let cleared = 0;

    for (const [email, data] of otpStore.entries()) {
        if (now > data.expiresAt) {
            otpStore.delete(email);
            cleared++;
        }
    }

    if (cleared > 0) {
        console.log(`🧹 Cleared ${cleared} expired OTP(s)`);
    }
}

// Clean up expired OTPs every 5 minutes
if (typeof window === 'undefined') {
    setInterval(clearExpiredOTPs, 5 * 60 * 1000);
}

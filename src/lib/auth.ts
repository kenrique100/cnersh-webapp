import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { nextCookies } from "better-auth/next-js";
import { sendVerificationEmail } from "@/lib/send-verification-email";
import { sendResetPasswordEmail } from "./send-reset-password-email";
import { ac, roles } from "./permissions";
import { sendOtpEmail } from "./send-otp-email";
import { admin, twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,

        // ✅ FIXED: removed invalid `_`
        sendResetPassword: async ({ url }) => {
            await sendResetPasswordEmail({
                to: "kenriqueanyere@gmail.com",
                subject: "Reset your password",
                url,
            });
        },
    },

    rateLimit: {
        enabled: true,
        window: 10,
        max: 2,
    },

    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,

        sendVerificationEmail: async ({ user, url }) => {
            await sendVerificationEmail({
                to: "kenriqueanyere@gmail.com",
                verificationUrl: url,
                userName: user.name,
            });
        },
    },

    user: {
        additionalFields: {
            gender: {
                type: "string",
                required: true,
                input: true,
                validate: (value: string) =>
                    ["male", "female"].includes(value) || "Invalid gender value",
            },
        },
    },

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            prompt: "select_account",
            redirectUri: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`,
        },
    },

    plugins: [
        admin({
            ac,
            roles,
            defaultRole: "user",
            adminRoles: ["admin", "superadmin"],
        }),

        nextCookies(),

        twoFactor({
            skipVerificationOnEnable: true,
            otpOptions: {

                async sendOTP({ otp }) {
                    await sendOtpEmail({
                        to: "kenriqueanyere@gmail.com",
                        otp,
                    });
                },
            },
        }),
    ],
});

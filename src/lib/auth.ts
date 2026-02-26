import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { nextCookies } from "better-auth/next-js";
import { sendVerificationEmail } from "@/lib/send-verification-email";
import { sendResetPasswordEmail } from "./send-reset-password-email";
import { ac, roles } from "./permissions";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),

    trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
        ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map(origin => origin.trim())
        : [],

    session: {
        expiresIn: 60 * 60, // 1 hour when "Remember Me" is NOT checked
        updateAge: 60 * 5, // Update session every 5 minutes
    },

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,

        sendResetPassword: async ({ user, url }) => {
            if (!user?.email) {
                throw new Error("User email is required for password reset");
            }
            await sendResetPasswordEmail({
                to: "kenriqueanyere@gmail.com",
                subject: "Reset your password",
                url,
            });
        },
    },

    rateLimit: {
        enabled: true,
        window: 60,
        max: 10,
    },

    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,

        sendVerificationEmail: async ({ user, url }) => {
            if (!user?.email) {
                throw new Error("User email is required for verification");
            }
            // Set callbackURL to homepage
            const verificationUrl = new URL(url);
            verificationUrl.searchParams.set("callbackURL", "/");
            await sendVerificationEmail({
                to: "kenriqueanyere@gmail.com",
                verificationUrl: verificationUrl.toString(),
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
    ],
});

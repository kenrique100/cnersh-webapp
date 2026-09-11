import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { nextCookies } from "better-auth/next-js";
import { sendVerificationEmail } from "@/lib/send-verification-email";
import { sendResetPasswordEmail } from "./send-reset-password-email";
import { ac, roles } from "./permissions";
import { admin } from "better-auth/plugins";

const authBaseUrl = process.env.BETTER_AUTH_URL;
if (!process.env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET must be set");
if (!authBaseUrl) throw new Error("BETTER_AUTH_URL must be set");
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw new Error("Google OAuth env vars must be set");

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authBaseUrl,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean) : [authBaseUrl],
  session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 * 24 },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      if (!user?.email) throw new Error("User email is required for password reset");
      await sendResetPasswordEmail({ to: user.email, subject: "Reset your password", url });
    },
  },
  rateLimit: { enabled: true, window: 60, max: 10 },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (!user?.email) throw new Error("User email is required for verification");
      const verificationUrl = new URL(url);
      verificationUrl.searchParams.set("callbackURL", "/");
      await sendVerificationEmail({ to: user.email, verificationUrl: verificationUrl.toString(), userName: user.name ?? undefined });
    },
  },
  user: {
    additionalFields: {
      gender: { type: "string", required: true, input: true, validate: (value: string) => ["male", "female"].includes(value) || "Invalid gender value" },
      profession: { type: "string", required: false, input: true },
      title: { type: "string", required: false, input: true },
      welcomeEmailSent: { type: "boolean", default: false },
    },
    // Better Auth's own `deleteUser` endpoint stays disabled (its default). A hard
    // row delete would be silently undone by a database restore. Account deletion
    // goes through src/lib/erasure/deletion-service.ts, which journals the intent
    // outside this database, scrubs the account and destroys the user's data key.
    deleteUser: { enabled: false },
  },
  socialProviders: {
    google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, prompt: "select_account", redirectUri: `${authBaseUrl}/api/auth/callback/google` },
  },
  plugins: [admin({ ac, roles, defaultRole: "user", adminRoles: ["admin", "superadmin"] }), nextCookies()],
});

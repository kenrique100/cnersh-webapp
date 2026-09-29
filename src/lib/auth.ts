import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { nextCookies } from "better-auth/next-js";
import { sendVerificationEmail } from "@/lib/send-verification-email";
import { sendResetPasswordEmail } from "./send-reset-password-email";
import { ac, roles } from "./permissions";
import { admin } from "better-auth/plugins";

/**
 * `next build` imports every route to collect page data, but no request is
 * ever served during a build — the auth instance is never actually invoked.
 * Without this exemption, `next build` in an environment that does not carry
 * production secrets (CI, a fresh clone, a Vercel preview build) fails at
 * the first route that transitively imports this module. A running server
 * still fails closed because every real env var is still required.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

function readEnv(name: string, buildPlaceholder: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isBuildPhase) return buildPlaceholder;
  throw new Error(`${name} must be set`);
}

const authSecret = readEnv(
    "BETTER_AUTH_SECRET",
    "build-placeholder-secret-not-used-at-runtime-0000"
);
const authBaseUrl = readEnv("BETTER_AUTH_URL", "http://localhost:3000");
const googleClientId = readEnv("GOOGLE_CLIENT_ID", "build-placeholder-google-id");
const googleClientSecret = readEnv(
    "GOOGLE_CLIENT_SECRET",
    "build-placeholder-google-secret"
);

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: authSecret,
  baseURL: authBaseUrl,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
      : [authBaseUrl],

  session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 * 24 },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      if (!user?.email) throw new Error("User email is required for password reset");
      await sendResetPasswordEmail({
        to: user.email,
        subject: "Reset your password",
        url,
      });
    },
  },

  rateLimit: { enabled: true, window: 60, max: 10 },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // Verification tokens expire after 1 hour. Better Auth also
    // invalidates them after a single successful verification.
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      if (!user?.email) throw new Error("User email is required for verification");
      const verificationUrl = new URL(url);
      verificationUrl.searchParams.set("callbackURL", "/feeds");
      await sendVerificationEmail({
        to: user.email,
        verificationUrl: verificationUrl.toString(),
        userName: user.name ?? undefined,
      });
    },
  },

  user: {
    additionalFields: {
      gender: {
        type: "string",
        required: false,
        input: true,
        validate: (value: string) =>
            value
                ? ["male", "female"].includes(value) || "Invalid gender value"
                : true,
      },
      profession: { type: "string", required: false, input: true },
      professionOther: { type: "string", required: false, input: true },
      title: { type: "string", required: false, input: true },
      welcomeEmailSent: { type: "boolean", default: false },
    },
  },

  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      prompt: "select_account",
      redirectUri: `${authBaseUrl}/api/auth/callback/google`,
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
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { nextCookies } from "better-auth/next-js";
import { sendVerificationEmail } from "@/lib/send-verification-email";
import { sendResetPasswordEmail } from "./send-reset-password-email";
import { ac, roles } from "./permissions";
import { admin } from "better-auth/plugins";
import { sendCnershVerificationEmail } from "@/lib/cnersh-verification";

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
  // IMPORTANT: do NOT enable session.cookieCache — the requirement is that
  // session data stays server-side and HttpOnly. Cookie caching would put
  // session state into a second browser cookie, which is not allowed.

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      if (!user?.email)
        throw new Error("User email is required for password reset");
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
      if (!user?.email)
        throw new Error("User email is required for verification");
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
      // The CNERSH gate. Every account — including Google — starts at
      // false and is flipped to true only after the CNERSH email
      // verification flow completes.
      cnershVerified: { type: "boolean", default: false },
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

  // CNERSH policy hooks.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Google users arrive with emailVerified: true but
          // cnershVerified: false. Send the CNERSH email now.
          // Email/password users are handled by sendOnSignUp.
          if (user.emailVerified && !(user as { cnershVerified?: boolean }).cnershVerified) {
            try {
              await sendCnershVerificationEmail({
                id: user.id,
                email: user.email,
                name: user.name ?? null,
              });
            } catch (err) {
              console.error(
                  "[auth.user.create.after] CNERSH send failed:",
                  err
              );
            }
          }
        },
      },
      update: {
        after: async (user) => {
          // Email/password users flip emailVerified → true via Better
          // Auth's built-in verify flow. Mirror that into
          // cnershVerified. Skip Google users: they already have
          // emailVerified: true and must complete the CNERSH flow.
          if (user.emailVerified && !(user as { cnershVerified?: boolean }).cnershVerified) {
            const googleAccount = await db.account.findFirst({
              where: { userId: user.id, providerId: "google" },
              select: { id: true },
            });
            if (!googleAccount) {
              await db.user.update({
                where: { id: user.id },
                data: { cnershVerified: true },
              });
            }
          }
        },
      },
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
"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { enforceActionRateLimit } from "@/lib/action-rate-limit";
import {
    consumeCnershToken,
    sendCnershVerificationEmail,
} from "@/lib/cnersh-verification";

const emailSchema = z.string().trim().toLowerCase().email().max(320);

const COOLDOWN_MS = 60 * 1000;

export type ResendResult =
    | { success: true; cooldownSeconds: number }
    | { success: false; error: string; cooldownSeconds?: number };

export async function resendCnershVerification(
    rawEmail: string
): Promise<ResendResult> {
    const parsed = emailSchema.safeParse(rawEmail);
    if (!parsed.success) {
        return { success: false, error: "Please enter a valid email address." };
    }
    const email = parsed.data;

    const user = await db.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, cnershVerified: true },
    });
    // Do not reveal account existence.
    if (!user || user.cnershVerified) {
        return { success: true, cooldownSeconds: COOLDOWN_MS / 1000 };
    }

    const hdrs = await headers();
    const ip =
        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        hdrs.get("x-real-ip") ||
        "unknown";

    // Per-IP bucket and per-email bucket.
    try {
        await enforceActionRateLimit(
            `cnersh-resend-ip:${ip}`,
            { windowMs: 15 * 60 * 1000, maxRequests: 10 },
            "cnersh-resend-ip",
            "Too many resend attempts from this address. Please wait a few minutes."
        );
        await enforceActionRateLimit(
            `cnersh-resend-email:${email}`,
            { windowMs: 60 * 1000, maxRequests: 1 },
            "cnersh-resend-email",
            "A verification email was just sent. Please check your inbox and wait a minute before trying again."
        );
    } catch (err) {
        const message =
            err instanceof Error
                ? err.message
                : "Please wait before requesting another email.";
        return {
            success: false,
            error: message,
            cooldownSeconds: COOLDOWN_MS / 1000,
        };
    }

    try {
        await sendCnershVerificationEmail(user);
    } catch (err) {
        console.error("[resendCnershVerification] send failed:", err);
        return {
            success: false,
            error: "Could not send the verification email. Please try again shortly.",
        };
    }

    return { success: true, cooldownSeconds: COOLDOWN_MS / 1000 };
}

export type ConfirmResult =
    | { success: true; email: string }
    | { success: false; reason: "not_found" | "expired" | "invalid" };

export async function confirmCnershVerification(
    token: string
): Promise<ConfirmResult> {
    const parsed = z.string().trim().min(1).max(256).safeParse(token);
    if (!parsed.success) return { success: false, reason: "invalid" };

    const outcome = await consumeCnershToken(parsed.data);
    if (!outcome.ok) return { success: false, reason: outcome.reason };

    const user = await db.user.findUnique({
        where: { email: outcome.email },
        select: { id: true, emailVerified: true },
    });
    if (!user) return { success: false, reason: "not_found" };

    // Flip both flags. `emailVerified` is required by Better Auth's
    // requireEmailVerification gate; `cnershVerified` is our own gate.
    await db.user.update({
        where: { id: user.id },
        data: {
            cnershVerified: true,
            ...(user.emailVerified ? {} : { emailVerified: true }),
        },
    });

    // If the user is currently signed in, refresh their session so the flag
    // appears on session.user immediately.
    try {
        const hdrs = await headers();
        const session = await auth.api.getSession({ headers: hdrs });
        if (session?.user?.email?.toLowerCase() === outcome.email) {
            await auth.api.getSession({ headers: hdrs });
        }
    } catch {
        // Not signed in — fine.
    }

    return { success: true, email: outcome.email };
}
"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { authSession } from "@/lib/auth-utils";
import { enforceActionRateLimit } from "@/lib/action-rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import { getErasureCapabilities } from "@/lib/erasure/config";
import {
    DeletionRefusedError,
    DeletionUnavailableError,
    getDeletionRequestForUser,
    requestAccountDeletion,
} from "@/lib/erasure/deletion-service";
import { isRecentSession } from "@/lib/erasure/recent-auth";
import { sanitizeText } from "@/lib/sanitize";

const CONFIRMATION_PHRASE = "DELETE";

const requestSchema = z.object({
    confirmation: z.string().trim().max(32),
    reason: z.string().trim().max(500).transform(sanitizeText).optional(),
});

export type AccountDeletionStatusView = "NONE" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";

export interface AccountDeletionContext {
    status: AccountDeletionStatusView;
    requestedAt: string | null;
    /** True when the current session is fresh enough to authorise deletion. */
    recentAuth: boolean;
    /** True when deletion can be accepted at all (erasure store configured). */
    available: boolean;
    /** True when destroyed keys live outside the application database backups. */
    keyStoreIsolated: boolean;
    isSuperAdmin: boolean;
}

function toStatusView(status: string | undefined): AccountDeletionStatusView {
    switch (status) {
        case "COMPLETED":
            return "COMPLETED";
        case "BLOCKED":
            return "BLOCKED";
        case "REQUESTED":
        case "ACCEPTED":
        case "PROCESSING":
            return "IN_PROGRESS";
        default:
            return "NONE";
    }
}

/** Everything the settings page needs to render the deletion card. */
export async function getAccountDeletionContext(): Promise<AccountDeletionContext | null> {
    const session = await authSession();
    if (!session) return null;

    const [request, capabilities] = await Promise.all([
        getDeletionRequestForUser(session.user.id),
        Promise.resolve(getErasureCapabilities()),
    ]);

    return {
        status: toStatusView(request?.status),
        requestedAt: request?.createdAt ? request.createdAt.toISOString() : null,
        recentAuth: isRecentSession(session.session.createdAt),
        available: capabilities.configured,
        keyStoreIsolated: capabilities.storeIsolated,
        isSuperAdmin: session.user.role === "superadmin",
    };
}

export type RequestMyAccountDeletionResult =
    | { ok: true; status: AccountDeletionStatusView }
    | { ok: false; code: "UNAUTHENTICATED" | "REAUTH" | "CONFIRMATION" | "UNAVAILABLE" | "REFUSED" | "RATE_LIMITED"; error: string };

/**
 * Self-service deletion. Authorisation is re-established at this boundary:
 * a valid session that was created recently, plus a typed confirmation.
 */
export async function requestMyAccountDeletion(rawInput: unknown): Promise<RequestMyAccountDeletionResult> {
    const session = await authSession();
    if (!session) return { ok: false, code: "UNAUTHENTICATED", error: "Sign in to continue." };

    const parsed = requestSchema.safeParse(rawInput);
    if (!parsed.success) {
        return { ok: false, code: "CONFIRMATION", error: "Type DELETE to confirm." };
    }
    if (parsed.data.confirmation !== CONFIRMATION_PHRASE) {
        return { ok: false, code: "CONFIRMATION", error: "Type DELETE to confirm." };
    }
    if (!isRecentSession(session.session.createdAt)) {
        return {
            ok: false,
            code: "REAUTH",
            error: "For your security, sign in again and return to Settings to delete your account.",
        };
    }

    try {
        await enforceActionRateLimit(
            session.user.id,
            RATE_LIMITS.accountDeletion,
            "account-deletion",
            "Too many deletion attempts."
        );
    } catch (error) {
        return { ok: false, code: "RATE_LIMITED", error: error instanceof Error ? error.message : "Too many attempts." };
    }

    try {
        const outcome = await requestAccountDeletion({
            userId: session.user.id,
            actorId: session.user.id,
            via: "SELF",
            reason: parsed.data.reason ?? null,
        });

        // Sessions are already revoked server-side; clear the browser cookie too.
        try {
            await auth.api.signOut({ headers: await headers() });
        } catch {
            // The session row is gone, so Better Auth may report it as missing.
        }

        return { ok: true, status: toStatusView(outcome.status) };
    } catch (error) {
        if (error instanceof DeletionUnavailableError) {
            return { ok: false, code: "UNAVAILABLE", error: error.message };
        }
        if (error instanceof DeletionRefusedError) {
            return { ok: false, code: "REFUSED", error: error.message };
        }
        console.error("[account-deletion] unexpected failure:", error);
        return { ok: false, code: "UNAVAILABLE", error: "Account deletion is temporarily unavailable. Please try again later." };
    }
}

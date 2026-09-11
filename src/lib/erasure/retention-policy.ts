/**
 * What happens to each kind of record when an account is deleted.
 *
 * CNERSH is a research-ethics committee platform. Some records are the
 * institution's evidence of how a protocol was reviewed and decided, and the
 * committee is expected to keep them after the author leaves. Those records
 * are retained with the author's identity replaced by a pseudonymous account
 * shell ("Deleted user"); everything else is deleted or scrubbed.
 *
 * This table is a product decision that must be confirmed by the CNERSH
 * privacy/legal owner before release. Adjust it here; the deletion service
 * reads from it and the documentation quotes it.
 */

import type { ProjectStatus } from "@/generated/prisma/client";

export type RetentionAction = "DELETE" | "SCRUB" | "RETAIN_PSEUDONYMISED" | "RETAIN_REKEYED";

export interface RetentionRule {
    record: string;
    action: RetentionAction;
    rationale: string;
}

export const RETENTION_POLICY: readonly RetentionRule[] = Object.freeze([
    { record: "Session, Account (password hash, OAuth tokens)", action: "DELETE", rationale: "Credentials and access are revoked immediately." },
    { record: "Verification tokens (email or user bound)", action: "DELETE", rationale: "Outstanding reset or verification links must stop working." },
    { record: "Notifications, likes and reactions", action: "DELETE", rationale: "Purely personal activity with no institutional value." },
    { record: "Files: avatar, image, video, audio", action: "DELETE", rationale: "Deleted from storage first, then from the database." },
    { record: "Files attached to retained protocols", action: "RETAIN_PSEUDONYMISED", rationale: "Part of the protocol record the committee reviewed." },
    { record: "Posts, comments, community topics and replies", action: "SCRUB", rationale: "Content is blanked and marked deleted; thread structure survives for other participants." },
    { record: "Reports filed by the user", action: "RETAIN_PSEUDONYMISED", rationale: "Moderation evidence; attribution moves to the account shell." },
    { record: "Protocols in DRAFT", action: "DELETE", rationale: "Never submitted; the data belongs only to the author." },
    { record: "Protocols after submission (with history, appeal, AAR, SAE)", action: "RETAIN_REKEYED", rationale: "Committee record. Encrypted payload re-keyed to the institutional key; ownership attributed to the account shell." },
    { record: "Review assignments with a COI declaration or evaluation", action: "RETAIN_PSEUDONYMISED", rationale: "Evidence of the review; reviewer attributed to the account shell." },
    { record: "Review assignments with no COI or evaluation yet", action: "DELETE", rationale: "No review work exists; the protocol must be reassigned." },
    { record: "Audit log entries", action: "RETAIN_PSEUDONYMISED", rationale: "Tamper-evident history; actor attributed to the account shell." },
    { record: "User row", action: "SCRUB", rationale: "Kept as a pseudonymous shell so retained records keep referential integrity; all personal fields cleared, sign-in blocked." },
]);

/** Protocol statuses that make a project an institutional record. */
export function isRetainedProjectStatus(status: ProjectStatus): boolean {
    return status !== "DRAFT";
}

export const RETAINED_FILE_TYPES = new Set(["protocol", "document"]);

export const TOMBSTONE_NAME = "Deleted user";
export const TOMBSTONE_EMAIL_DOMAIN = "erased.invalid";
export const TOMBSTONE_BAN_REASON = "ACCOUNT_DELETED";
export const PENDING_BAN_REASON = "ACCOUNT_DELETION_IN_PROGRESS";

export function tombstoneEmail(userId: string): string {
    return `deleted-${userId}@${TOMBSTONE_EMAIL_DOMAIN}`;
}

export function isTombstoneEmail(email: string | null | undefined): boolean {
    return Boolean(email && email.endsWith(`@${TOMBSTONE_EMAIL_DOMAIN}`));
}

/** Field values written to the user row when it becomes a shell. */
export function tombstoneUserFields(userId: string, erasedAt: Date) {
    return {
        name: TOMBSTONE_NAME,
        email: tombstoneEmail(userId),
        emailVerified: false,
        image: null,
        bio: null,
        profession: null,
        title: null,
        gender: null,
        expertiseTags: [] as string[],
        role: "user",
        hasDeletePermission: false,
        banned: true,
        banReason: TOMBSTONE_BAN_REASON,
        banExpires: null,
        pendingActivation: false,
        activationExpiresAt: null,
        welcomeEmailSent: true,
        erasedAt,
    };
}

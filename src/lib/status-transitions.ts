import { ProjectStatus } from "@/generated/prisma";

/**
 * Single source of truth for legal protocol status transitions.
 *
 * Rules:
 *  - Owner-driven transitions (SUBMITTED, RETURNED_INCOMPLETE, RESUBMIT) are
 *    triggered by the owner via submitProject / updateProject / resubmitProtocol.
 *  - Reviewer-driven transitions (REVIEW_COMPLETE onward) are triggered by
 *    updateProjectStatus, which now requires the caller to be the protocol's
 *    current reviewer or the superadmin.
 */
export const PROJECT_TRANSITIONS: Partial<
    Record<ProjectStatus, readonly ProjectStatus[]>
> = {
    [ProjectStatus.SUBMITTED]: [
        ProjectStatus.RETURNED_INCOMPLETE,
        ProjectStatus.PENDING_REVIEW,
    ],
    [ProjectStatus.RETURNED_INCOMPLETE]: [ProjectStatus.PENDING_REVIEW],
    [ProjectStatus.RESUBMIT]: [ProjectStatus.PENDING_REVIEW],
    [ProjectStatus.REVIEW_COMPLETE]: [
        ProjectStatus.SESSION_SCHEDULED,
        ProjectStatus.APPROVED,
        ProjectStatus.APPROVED_WITH_CONDITIONS,
        ProjectStatus.RESUBMIT,
    ],
    [ProjectStatus.SESSION_SCHEDULED]: [
        ProjectStatus.APPROVED,
        ProjectStatus.APPROVED_WITH_CONDITIONS,
        ProjectStatus.RESUBMIT,
    ],
};

/** Statuses a user can resubmit from. */
export const OWNER_RESUBMIT_STATUSES: readonly ProjectStatus[] = [
    ProjectStatus.RETURNED_INCOMPLETE,
    ProjectStatus.RESUBMIT,
];

/** Statuses in which the owner may still edit the protocol body. */
export const OWNER_MUTABLE_STATUSES: readonly ProjectStatus[] = [
    ProjectStatus.DRAFT,
    ProjectStatus.RETURNED_INCOMPLETE,
];

/** Statuses that should receive a review assignment. */
export const ASSIGNABLE_PROJECT_STATUSES: readonly ProjectStatus[] = [
    ProjectStatus.SUBMITTED,
    ProjectStatus.RETURNED_INCOMPLETE,
    ProjectStatus.PENDING_REVIEW,
    ProjectStatus.UNDER_REVIEW,
];

/** Transitions that require reviewer-supplied feedback. */
export const FEEDBACK_REQUIRED_STATUSES: readonly ProjectStatus[] = [
    ProjectStatus.RESUBMIT,
    ProjectStatus.RETURNED_INCOMPLETE,
    ProjectStatus.APPROVED_WITH_CONDITIONS,
];

/** Approval statuses; used for the 12-month validity window. */
export const APPROVAL_STATUSES: readonly ProjectStatus[] = [
    ProjectStatus.APPROVED,
    ProjectStatus.APPROVED_WITH_CONDITIONS,
];

export function isLegalTransition(
    from: ProjectStatus,
    to: ProjectStatus
): boolean {
    return (PROJECT_TRANSITIONS[from] ?? []).includes(to);
}

export function requiresFeedback(status: ProjectStatus): boolean {
    return FEEDBACK_REQUIRED_STATUSES.includes(status);
}

export function isApproval(status: ProjectStatus): boolean {
    return APPROVAL_STATUSES.includes(status);
}
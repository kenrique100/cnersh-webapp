"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { EvaluationRecommendation, Prisma } from "@/generated/prisma";
import { z } from "zod";

const idSchema = z.string().trim().min(1, "Assignment identifier is required").max(128);
const scoreSchema = z.number().int().min(1).max(5);
const commentSchema = z.string().trim().max(10_000).optional();
const evaluationShape = {
    socialValue: scoreSchema.optional(),
    scientificValidity: scoreSchema.optional(),
    riskBenefitAnalysis: scoreSchema.optional(),
    participantSelection: scoreSchema.optional(),
    informedConsentProcess: scoreSchema.optional(),
    confidentialityDataProtection: scoreSchema.optional(),
    collaborativePartnership: scoreSchema.optional(),
    socialValueComment: commentSchema,
    scientificValidityComment: commentSchema,
    riskBenefitAnalysisComment: commentSchema,
    participantSelectionComment: commentSchema,
    informedConsentProcessComment: commentSchema,
    confidentialityDataProtectionComment: commentSchema,
    collaborativePartnershipComment: commentSchema,
    overallScore: z.number().min(1).max(5).optional(),
    recommendation: z.enum(EvaluationRecommendation).optional(),
    generalComments: commentSchema,
    additionalCriteria: z.record(z.string(), z.json()).optional(),
};
const draftSchema = z.object(evaluationShape).strict();
const submissionSchema = draftSchema.extend({
    socialValue: scoreSchema,
    scientificValidity: scoreSchema,
    riskBenefitAnalysis: scoreSchema,
    participantSelection: scoreSchema,
    informedConsentProcess: scoreSchema,
    confidentialityDataProtection: scoreSchema,
    collaborativePartnership: scoreSchema,
    recommendation: z.enum(EvaluationRecommendation),
});

interface EvaluationScores {
    socialValue?: number;
    scientificValidity?: number;
    riskBenefitAnalysis?: number;
    participantSelection?: number;
    informedConsentProcess?: number;
    confidentialityDataProtection?: number;
    collaborativePartnership?: number;
    socialValueComment?: string;
    scientificValidityComment?: string;
    riskBenefitAnalysisComment?: string;
    participantSelectionComment?: string;
    informedConsentProcessComment?: string;
    confidentialityDataProtectionComment?: string;
    collaborativePartnershipComment?: string;
    overallScore?: number;
    recommendation?: EvaluationRecommendation;
    generalComments?: string;
    additionalCriteria?: Record<string, unknown>;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) throw new Error(result.error.issues[0]?.message || "Invalid evaluation data");
    return result.data;
}

function jsonValue(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    try {
        return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
        throw new Error("Additional criteria must be JSON serializable");
    }
}

function assertAssignmentAccess(
    assignment: {
        reviewerId: string;
        status: string;
        coiDeclaration: { hasCOI: boolean } | null;
        project: { deleted: boolean; status: string };
    },
    userId: string,
) {
    if (assignment.reviewerId !== userId) throw new Error("Forbidden");
    if (assignment.project.deleted) throw new Error("Review assignment not found");
    if (assignment.status === "EXCLUDED" || assignment.coiDeclaration?.hasCOI) {
        throw new Error("Excluded reviewers cannot access evaluation reports");
    }
    if (assignment.status !== "ACTIVE") {
        throw new Error("You must submit a no-COI declaration before evaluating a protocol");
    }
    if (!assignment.coiDeclaration || assignment.coiDeclaration.hasCOI) {
        throw new Error("You must submit a no-COI declaration before evaluating a protocol");
    }
    if (!["PENDING_REVIEW", "UNDER_REVIEW"].includes(assignment.project.status)) {
        throw new Error("This protocol is not currently under review");
    }
}

export async function saveEvaluationDraft(assignmentId: string, scores: EvaluationScores) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validAssignmentId = parse(idSchema, assignmentId);
    const input = parse(draftSchema, scores);
    const additionalCriteria = jsonValue(input.additionalCriteria);

    return db.$transaction(async (tx) => {
        const assignment = await tx.reviewAssignment.findUnique({
            where: { id: validAssignmentId },
            include: {
                coiDeclaration: true,
                evaluationReport: true,
                project: { select: { id: true, title: true, deleted: true, status: true } },
            },
        });
        if (!assignment) throw new Error("Review assignment not found");
        assertAssignmentAccess(assignment, session.user.id);
        if (assignment.evaluationReport?.status === "SUBMITTED") {
            throw new Error("Evaluation report has already been submitted and cannot be edited");
        }

        return tx.evaluationReport.upsert({
            where: { assignmentId: validAssignmentId },
            create: {
                assignmentId: validAssignmentId,
                reviewerId: session.user.id,
                ...input,
                additionalCriteria,
                status: "DRAFT",
            },
            update: {
                ...input,
                additionalCriteria,
                reviewerId: session.user.id,
                status: "DRAFT",
                submittedAt: null,
            },
        });
    });
}

export async function submitEvaluationReport(assignmentId: string, scores: EvaluationScores) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validAssignmentId = parse(idSchema, assignmentId);
    const input = parse(submissionSchema, scores);
    const additionalCriteria = jsonValue(input.additionalCriteria);

    const result = await db.$transaction(async (tx) => {
        const assignment = await tx.reviewAssignment.findUnique({
            where: { id: validAssignmentId },
            include: {
                coiDeclaration: true,
                evaluationReport: true,
                project: { select: { id: true, title: true, deleted: true, status: true } },
            },
        });
        if (!assignment) throw new Error("Review assignment not found");
        if (assignment.evaluationReport?.status === "SUBMITTED") {
            if (assignment.reviewerId !== session.user.id) throw new Error("Forbidden");
            if (assignment.status === "EXCLUDED" || assignment.project.deleted) {
                throw new Error("Excluded reviewers cannot access evaluation reports");
            }
            return assignment.evaluationReport;
        }
        assertAssignmentAccess(assignment, session.user.id);

        const now = new Date();
        const report = await tx.evaluationReport.upsert({
            where: { assignmentId: validAssignmentId },
            create: {
                assignmentId: validAssignmentId,
                reviewerId: session.user.id,
                ...input,
                additionalCriteria,
                status: "SUBMITTED",
                submittedAt: now,
            },
            update: {
                reviewerId: session.user.id,
                ...input,
                additionalCriteria,
                status: "SUBMITTED",
                submittedAt: now,
            },
        });

        const completed = await tx.reviewAssignment.updateMany({
            where: {
                id: validAssignmentId,
                reviewerId: session.user.id,
                status: "ACTIVE",
                project: {
                    deleted: false,
                    status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
                },
            },
            data: { status: "COMPLETED" },
        });
        if (completed.count !== 1) throw new Error("Review assignment changed concurrently; please retry");

        const submittedCount = await tx.reviewAssignment.count({
            where: {
                projectId: assignment.project.id,
                status: "COMPLETED",
                evaluationReport: { is: { status: "SUBMITTED" } },
            },
        });
        if (submittedCount >= 2) {
            const transitioned = await tx.project.updateMany({
                where: {
                    id: assignment.project.id,
                    deleted: false,
                    status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
                },
                data: { status: "REVIEW_COMPLETE" },
            });
            if (transitioned.count === 1) {
                await tx.projectStatusHistory.create({
                    data: {
                        projectId: assignment.project.id,
                        status: "REVIEW_COMPLETE",
                        changedBy: session.user.id,
                        comment: `${submittedCount} evaluation reports submitted`,
                    },
                });
            }
        }

        await tx.auditLog.create({
            data: {
                action: "EVALUATION_SUBMITTED",
                details: `Evaluation report submitted for protocol "${assignment.project.title}"`,
                targetId: assignment.project.id,
                userId: session.user.id,
            },
        });
        return report;
    });

    return {
        id: result.id,
        submittedAt: result.submittedAt?.toISOString(),
    };
}

export async function getMyEvaluationReport(assignmentId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validAssignmentId = parse(idSchema, assignmentId);

    const assignment = await db.reviewAssignment.findUnique({
        where: { id: validAssignmentId },
        select: { reviewerId: true, status: true, project: { select: { deleted: true } } },
    });

    if (!assignment || assignment.project.deleted) throw new Error("Assignment not found");
    if (assignment.reviewerId !== session.user.id) throw new Error("Forbidden");
    if (assignment.status === "EXCLUDED") {
        throw new Error("Excluded reviewers cannot access evaluation reports");
    }

    return db.evaluationReport.findUnique({ where: { assignmentId: validAssignmentId } });
}

/**
 * Admin only: get all submitted evaluation reports for a non-deleted project.
 * Reviewer names and scores are never exposed to PIs via this function.
 */
export async function getProjectEvaluationReports(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");
    const validProjectId = parse(idSchema, projectId);

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden: Evaluation reports are restricted to admin users");
    }

    const project = await db.project.findUnique({
        where: { id: validProjectId, deleted: false },
        select: { id: true },
    });
    if (!project) throw new Error("Protocol not found");
    const excluded = await db.reviewAssignment.findFirst({
        where: {
            projectId: validProjectId,
            reviewerId: session.user.id,
            status: "EXCLUDED",
        },
        select: { id: true },
    });
    if (excluded && user.role !== "superadmin") {
        throw new Error("Forbidden: Excluded reviewers cannot access evaluation reports");
    }

    return db.evaluationReport.findMany({
        where: {
            status: "SUBMITTED",
            assignment: { projectId: validProjectId, status: "COMPLETED" },
        },
        include: {
            reviewer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
    });
}

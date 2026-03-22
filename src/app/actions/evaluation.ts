"use server";

import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { EvaluationRecommendation, Prisma } from "@/generated/prisma";

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

export async function saveEvaluationDraft(assignmentId: string, scores: EvaluationScores) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const assignment = await db.reviewAssignment.findUnique({
        where: { id: assignmentId },
        include: {
            coiDeclaration: true,
            evaluationReport: true,
            project: { select: { id: true, title: true } },
        },
    });

    if (!assignment) throw new Error("Review assignment not found");
    if (assignment.reviewerId !== session.user.id) throw new Error("Forbidden");
    if (assignment.status !== "ACTIVE") {
        throw new Error("You must submit a no-COI declaration before evaluating a protocol");
    }
    if (assignment.evaluationReport?.status === "SUBMITTED") {
        throw new Error("Evaluation report has already been submitted and cannot be edited");
    }

    const data = {
        reviewerId: session.user.id,
        ...scores,
        additionalCriteria: scores.additionalCriteria
            ? (JSON.parse(JSON.stringify(scores.additionalCriteria)) as Prisma.InputJsonValue)
            : undefined,
        status: "DRAFT" as const,
    };

    if (assignment.evaluationReport) {
        return db.evaluationReport.update({
            where: { assignmentId },
            data,
        });
    }

    return db.evaluationReport.create({
        data: {
            assignmentId,
            ...data,
        },
    });
}

export async function submitEvaluationReport(assignmentId: string, scores: EvaluationScores) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const assignment = await db.reviewAssignment.findUnique({
        where: { id: assignmentId },
        include: {
            coiDeclaration: true,
            evaluationReport: true,
            project: { select: { id: true, title: true } },
        },
    });

    if (!assignment) throw new Error("Review assignment not found");
    if (assignment.reviewerId !== session.user.id) throw new Error("Forbidden");
    if (assignment.status !== "ACTIVE") {
        throw new Error("You must submit a no-COI declaration before evaluating a protocol");
    }
    if (assignment.evaluationReport?.status === "SUBMITTED") {
        throw new Error("Evaluation report has already been submitted");
    }

    // Validate required fields
    const requiredCriteria: (keyof EvaluationScores)[] = [
        "socialValue",
        "scientificValidity",
        "riskBenefitAnalysis",
        "participantSelection",
        "informedConsentProcess",
        "confidentialityDataProtection",
        "collaborativePartnership",
    ];
    for (const criterion of requiredCriteria) {
        if (!scores[criterion]) {
            throw new Error(`Score for "${criterion}" is required`);
        }
    }
    if (!scores.recommendation) throw new Error("A recommendation is required");

    const now = new Date();

    const reportData = {
        reviewerId: session.user.id,
        ...scores,
        additionalCriteria: scores.additionalCriteria
            ? (JSON.parse(JSON.stringify(scores.additionalCriteria)) as Prisma.InputJsonValue)
            : undefined,
        status: "SUBMITTED" as const,
        submittedAt: now,
    };

    let report;
    if (assignment.evaluationReport) {
        report = await db.evaluationReport.update({
            where: { assignmentId },
            data: reportData,
        });
    } else {
        report = await db.evaluationReport.create({
            data: {
                assignmentId,
                ...reportData,
            },
        });
    }

    // Mark the assignment as completed
    await db.reviewAssignment.update({
        where: { id: assignmentId },
        data: { status: "COMPLETED" },
    });

    // Check how many evaluations are complete for this project
    const allAssignments = await db.reviewAssignment.findMany({
        where: { projectId: assignment.project.id },
        include: { evaluationReport: { select: { status: true } } },
    });

    const submittedCount = allAssignments.filter(
        (a) => a.evaluationReport?.status === "SUBMITTED"
    ).length;

    // If 2+ reports submitted, mark protocol as REVIEW_COMPLETE
    if (submittedCount >= 2) {
        await db.project.update({
            where: { id: assignment.project.id },
            data: {
                status: "REVIEW_COMPLETE",
                statusHistory: {
                    create: {
                        status: "REVIEW_COMPLETE",
                        changedBy: session.user.id,
                        comment: `${submittedCount} evaluation reports submitted`,
                    },
                },
            },
        });
    }

    await db.auditLog.create({
        data: {
            action: "EVALUATION_SUBMITTED",
            details: `Evaluation report submitted for protocol "${assignment.project.title}"`,
            targetId: assignment.project.id,
            userId: session.user.id,
        },
    });

    return {
        id: report.id,
        submittedAt: report.submittedAt?.toISOString(),
    };
}

export async function getMyEvaluationReport(assignmentId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const assignment = await db.reviewAssignment.findUnique({
        where: { id: assignmentId },
        select: { reviewerId: true },
    });

    if (!assignment) throw new Error("Assignment not found");
    if (assignment.reviewerId !== session.user.id) throw new Error("Forbidden");

    return db.evaluationReport.findUnique({
        where: { assignmentId },
    });
}

/**
 * Admin only: get all evaluation reports for a project.
 * Reviewer names and scores are NEVER exposed to PIs via this function.
 */
export async function getProjectEvaluationReports(projectId: string) {
    const session = await authSession();
    if (!session) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "admin" && user?.role !== "superadmin") {
        throw new Error("Forbidden: Evaluation reports are restricted to admin users");
    }

    return db.evaluationReport.findMany({
        where: {
            assignment: { projectId },
        },
        include: {
            reviewer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
    });
}

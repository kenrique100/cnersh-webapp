-- Add new fields to User table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "expertiseTags" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pendingActivation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "activationExpiresAt" TIMESTAMP(3);

-- Add referenceNumber to Project table
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;

-- Extend project_status enum with new values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'project_status' AND e.enumlabel = 'RETURNED_INCOMPLETE') THEN
        ALTER TYPE "project_status" ADD VALUE 'RETURNED_INCOMPLETE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'project_status' AND e.enumlabel = 'UNDER_REVIEW') THEN
        ALTER TYPE "project_status" ADD VALUE 'UNDER_REVIEW';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'project_status' AND e.enumlabel = 'REVIEW_COMPLETE') THEN
        ALTER TYPE "project_status" ADD VALUE 'REVIEW_COMPLETE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'project_status' AND e.enumlabel = 'SESSION_SCHEDULED') THEN
        ALTER TYPE "project_status" ADD VALUE 'SESSION_SCHEDULED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'project_status' AND e.enumlabel = 'APPROVED_WITH_CONDITIONS') THEN
        ALTER TYPE "project_status" ADD VALUE 'APPROVED_WITH_CONDITIONS';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'project_status' AND e.enumlabel = 'UNDER_APPEAL') THEN
        ALTER TYPE "project_status" ADD VALUE 'UNDER_APPEAL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'project_status' AND e.enumlabel = 'APPEAL_RESOLVED') THEN
        ALTER TYPE "project_status" ADD VALUE 'APPEAL_RESOLVED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'project_status' AND e.enumlabel = 'ARCHIVED') THEN
        ALTER TYPE "project_status" ADD VALUE 'ARCHIVED';
    END IF;
END $$;

-- Create review_assignment_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_assignment_status') THEN
        CREATE TYPE "review_assignment_status" AS ENUM ('PENDING_COI', 'ACTIVE', 'EXCLUDED', 'COMPLETED');
    END IF;
END $$;

-- Create evaluation_recommendation enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evaluation_recommendation') THEN
        CREATE TYPE "evaluation_recommendation" AS ENUM ('FAVORABLE', 'FAVORABLE_WITH_CONDITIONS', 'UNFAVORABLE');
    END IF;
END $$;

-- Create evaluation_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evaluation_status') THEN
        CREATE TYPE "evaluation_status" AS ENUM ('DRAFT', 'SUBMITTED');
    END IF;
END $$;

-- Create session_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
        CREATE TYPE "session_type" AS ENUM ('ORDINARY', 'EXTRAORDINARY');
    END IF;
END $$;

-- Create session_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
        CREATE TYPE "session_status" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');
    END IF;
END $$;

-- Create appeal_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appeal_status') THEN
        CREATE TYPE "appeal_status" AS ENUM ('PENDING', 'UPHELD', 'REJECTED', 'EXPIRED');
    END IF;
END $$;

-- Create aar_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aar_status') THEN
        CREATE TYPE "aar_status" AS ENUM ('DRAFT', 'SUBMITTED', 'RECEIVED_BY_DROS', 'CLARIFICATION_REQUESTED', 'AUTHORIZED', 'INADMISSIBLE');
    END IF;
END $$;

-- Create sae_event_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sae_event_type') THEN
        CREATE TYPE "sae_event_type" AS ENUM ('ADVERSE_EVENT', 'SERIOUS_ADVERSE_EVENT', 'UNEXPECTED_ADVERSE_EVENT', 'LIFE_THREATENING', 'FATAL');
    END IF;
END $$;

-- Create review_assignment table
CREATE TABLE IF NOT EXISTS "review_assignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "review_assignment_status" NOT NULL DEFAULT 'PENDING_COI',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_assignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_assignment_projectId_reviewerId_key" ON "review_assignment"("projectId", "reviewerId");
CREATE INDEX IF NOT EXISTS "review_assignment_projectId_idx" ON "review_assignment"("projectId");
CREATE INDEX IF NOT EXISTS "review_assignment_reviewerId_idx" ON "review_assignment"("reviewerId");

ALTER TABLE "review_assignment" DROP CONSTRAINT IF EXISTS "review_assignment_projectId_fkey";
ALTER TABLE "review_assignment" ADD CONSTRAINT "review_assignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "review_assignment" DROP CONSTRAINT IF EXISTS "review_assignment_reviewerId_fkey";
ALTER TABLE "review_assignment" ADD CONSTRAINT "review_assignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create coi_declaration table
CREATE TABLE IF NOT EXISTS "coi_declaration" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hasCOI" BOOLEAN NOT NULL,
    "details" TEXT,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coi_declaration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coi_declaration_assignmentId_key" ON "coi_declaration"("assignmentId");
CREATE INDEX IF NOT EXISTS "coi_declaration_userId_idx" ON "coi_declaration"("userId");

ALTER TABLE "coi_declaration" DROP CONSTRAINT IF EXISTS "coi_declaration_assignmentId_fkey";
ALTER TABLE "coi_declaration" ADD CONSTRAINT "coi_declaration_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "review_assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coi_declaration" DROP CONSTRAINT IF EXISTS "coi_declaration_userId_fkey";
ALTER TABLE "coi_declaration" ADD CONSTRAINT "coi_declaration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create evaluation_report table
CREATE TABLE IF NOT EXISTS "evaluation_report" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "socialValue" INTEGER,
    "scientificValidity" INTEGER,
    "riskBenefitAnalysis" INTEGER,
    "participantSelection" INTEGER,
    "informedConsentProcess" INTEGER,
    "confidentialityDataProtection" INTEGER,
    "collaborativePartnership" INTEGER,
    "socialValueComment" TEXT,
    "scientificValidityComment" TEXT,
    "riskBenefitAnalysisComment" TEXT,
    "participantSelectionComment" TEXT,
    "informedConsentProcessComment" TEXT,
    "confidentialityDataProtectionComment" TEXT,
    "collaborativePartnershipComment" TEXT,
    "overallScore" DOUBLE PRECISION,
    "recommendation" "evaluation_recommendation",
    "generalComments" TEXT,
    "additionalCriteria" JSONB,
    "status" "evaluation_status" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "evaluation_report_assignmentId_key" ON "evaluation_report"("assignmentId");
CREATE INDEX IF NOT EXISTS "evaluation_report_reviewerId_idx" ON "evaluation_report"("reviewerId");

ALTER TABLE "evaluation_report" DROP CONSTRAINT IF EXISTS "evaluation_report_assignmentId_fkey";
ALTER TABLE "evaluation_report" ADD CONSTRAINT "evaluation_report_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "review_assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "evaluation_report" DROP CONSTRAINT IF EXISTS "evaluation_report_reviewerId_fkey";
ALTER TABLE "evaluation_report" ADD CONSTRAINT "evaluation_report_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create committee_session table
CREATE TABLE IF NOT EXISTS "committee_session" (
    "id" TEXT NOT NULL,
    "sessionType" "session_type" NOT NULL DEFAULT 'ORDINARY',
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "agenda" TEXT[] NOT NULL DEFAULT '{}',
    "status" "session_status" NOT NULL DEFAULT 'SCHEDULED',
    "quorumMet" BOOLEAN,
    "minutes" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "committee_session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "committee_session_sessionDate_idx" ON "committee_session"("sessionDate");
CREATE INDEX IF NOT EXISTS "committee_session_status_idx" ON "committee_session"("status");

-- Create appeal table
CREATE TABLE IF NOT EXISTS "appeal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "appellantId" TEXT NOT NULL,
    "grounds" TEXT NOT NULL,
    "evidence" TEXT,
    "status" "appeal_status" NOT NULL DEFAULT 'PENDING',
    "decision" TEXT,
    "decisionDate" TIMESTAMP(3),
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "appeal_projectId_key" ON "appeal"("projectId");
CREATE INDEX IF NOT EXISTS "appeal_appellantId_idx" ON "appeal"("appellantId");

ALTER TABLE "appeal" DROP CONSTRAINT IF EXISTS "appeal_projectId_fkey";
ALTER TABLE "appeal" ADD CONSTRAINT "appeal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appeal" DROP CONSTRAINT IF EXISTS "appeal_appellantId_fkey";
ALTER TABLE "appeal" ADD CONSTRAINT "appeal_appellantId_fkey" FOREIGN KEY ("appellantId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create aar_application table
CREATE TABLE IF NOT EXISTS "aar_application" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "status" "aar_status" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "drosReceivedAt" TIMESTAMP(3),
    "drosDueDate" TIMESTAMP(3),
    "aarRefNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aar_application_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "aar_application_projectId_key" ON "aar_application"("projectId");
CREATE INDEX IF NOT EXISTS "aar_application_applicantId_idx" ON "aar_application"("applicantId");

ALTER TABLE "aar_application" DROP CONSTRAINT IF EXISTS "aar_application_projectId_fkey";
ALTER TABLE "aar_application" ADD CONSTRAINT "aar_application_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aar_application" DROP CONSTRAINT IF EXISTS "aar_application_applicantId_fkey";
ALTER TABLE "aar_application" ADD CONSTRAINT "aar_application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create sae_report table
CREATE TABLE IF NOT EXISTS "sae_report" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "eventType" "sae_event_type" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "immediateActions" TEXT,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sae_report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sae_report_projectId_idx" ON "sae_report"("projectId");
CREATE INDEX IF NOT EXISTS "sae_report_reporterId_idx" ON "sae_report"("reporterId");

ALTER TABLE "sae_report" DROP CONSTRAINT IF EXISTS "sae_report_projectId_fkey";
ALTER TABLE "sae_report" ADD CONSTRAINT "sae_report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sae_report" DROP CONSTRAINT IF EXISTS "sae_report_reporterId_fkey";
ALTER TABLE "sae_report" ADD CONSTRAINT "sae_report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

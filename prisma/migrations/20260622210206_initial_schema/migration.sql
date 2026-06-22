-- CreateEnum
CREATE TYPE "gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "file_type" AS ENUM ('avatar', 'protocol', 'document', 'image', 'video', 'audio');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED_INCOMPLETE', 'PENDING_REVIEW', 'UNDER_REVIEW', 'REVIEW_COMPLETE', 'SESSION_SCHEDULED', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'RESUBMIT', 'UNDER_APPEAL', 'APPEAL_RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "report_target" AS ENUM ('POST', 'COMMENT', 'TOPIC', 'REPLY');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('PROJECT_STATUS', 'REVIEW_ASSIGNED', 'REVIEW_REASSIGNED', 'COMMENT', 'LIKE', 'MENTION', 'SYSTEM', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "review_assignment_status" AS ENUM ('PENDING_COI', 'ACTIVE', 'EXCLUDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "evaluation_recommendation" AS ENUM ('FAVORABLE', 'FAVORABLE_WITH_CONDITIONS', 'UNFAVORABLE');

-- CreateEnum
CREATE TYPE "evaluation_status" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "session_type" AS ENUM ('ORDINARY', 'EXTRAORDINARY');

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "appeal_status" AS ENUM ('PENDING', 'UPHELD', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "aar_status" AS ENUM ('DRAFT', 'SUBMITTED', 'RECEIVED_BY_DROS', 'CLARIFICATION_REQUESTED', 'AUTHORIZED', 'INADMISSIBLE');

-- CreateEnum
CREATE TYPE "sae_event_type" AS ENUM ('ADVERSE_EVENT', 'SERIOUS_ADVERSE_EVENT', 'UNEXPECTED_ADVERSE_EVENT', 'LIFE_THREATENING', 'FATAL');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT,
    "bio" TEXT,
    "hasDeletePermission" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "gender" "gender",
    "profession" TEXT,
    "title" TEXT,
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "expertiseTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pendingActivation" BOOLEAN NOT NULL DEFAULT false,
    "activationExpiresAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT,
    "data" TEXT,
    "type" "file_type" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "video" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkUrl" TEXT,
    "linkType" TEXT,
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_like" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isDislike" BOOLEAN NOT NULL DEFAULT false,
    "reactionType" TEXT NOT NULL DEFAULT 'Like',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "like" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reactionType" TEXT NOT NULL DEFAULT 'Like',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objectives" TEXT,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "timeline" TEXT,
    "budget" TEXT,
    "document" TEXT,
    "formData" JSONB,
    "status" "project_status" NOT NULL DEFAULT 'DRAFT',
    "feedback" TEXT,
    "userId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_status_history" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "project_status" NOT NULL,
    "comment" TEXT,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_topic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "image" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video" TEXT,
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkUrl" TEXT,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_topic_like" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isDislike" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_topic_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_reply" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video" TEXT,
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audio" TEXT,
    "audios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "voiceNote" TEXT,
    "document" TEXT,
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkUrl" TEXT,
    "pollQuestion" TEXT,
    "pollOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pollVotes" JSONB,
    "eventTitle" TEXT,
    "eventDate" TIMESTAMP(3),
    "eventLocation" TEXT,
    "topicId" TEXT NOT NULL,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "contentType" "report_target" NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "targetId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "fileUrl" TEXT,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_assignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "review_assignment_status" NOT NULL DEFAULT 'PENDING_COI',
    "dueDate" TIMESTAMP(3),
    "reassignedFromId" TEXT,
    "reassignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coi_declaration" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hasCOI" BOOLEAN NOT NULL,
    "details" TEXT,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coi_declaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_report" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_session" (
    "id" TEXT NOT NULL,
    "sessionType" "session_type" NOT NULL DEFAULT 'ORDINARY',
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "agenda" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "session_status" NOT NULL DEFAULT 'SCHEDULED',
    "quorumMet" BOOLEAN,
    "minutes" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "committee_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeal" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aar_application" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aar_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sae_report" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "eventType" "sae_event_type" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "immediateActions" TEXT,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sae_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "file_userId_idx" ON "file"("userId");

-- CreateIndex
CREATE INDEX "file_type_idx" ON "file"("type");

-- CreateIndex
CREATE INDEX "file_userId_type_idx" ON "file"("userId", "type");

-- CreateIndex
CREATE INDEX "file_createdAt_idx" ON "file"("createdAt");

-- CreateIndex
CREATE INDEX "post_userId_idx" ON "post"("userId");

-- CreateIndex
CREATE INDEX "post_createdAt_idx" ON "post"("createdAt");

-- CreateIndex
CREATE INDEX "post_userId_createdAt_idx" ON "post"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "post_deleted_createdAt_idx" ON "post"("deleted", "createdAt");

-- CreateIndex
CREATE INDEX "comment_postId_idx" ON "comment"("postId");

-- CreateIndex
CREATE INDEX "comment_userId_idx" ON "comment"("userId");

-- CreateIndex
CREATE INDEX "comment_parentId_idx" ON "comment"("parentId");

-- CreateIndex
CREATE INDEX "comment_like_commentId_idx" ON "comment_like"("commentId");

-- CreateIndex
CREATE INDEX "comment_like_userId_idx" ON "comment_like"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "comment_like_commentId_userId_key" ON "comment_like"("commentId", "userId");

-- CreateIndex
CREATE INDEX "like_postId_idx" ON "like"("postId");

-- CreateIndex
CREATE INDEX "like_userId_idx" ON "like"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "like_postId_userId_key" ON "like"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_trackingCode_key" ON "project"("trackingCode");

-- CreateIndex
CREATE INDEX "project_userId_idx" ON "project"("userId");

-- CreateIndex
CREATE INDEX "project_assignedToId_idx" ON "project"("assignedToId");

-- CreateIndex
CREATE INDEX "project_status_idx" ON "project"("status");

-- CreateIndex
CREATE INDEX "project_trackingCode_idx" ON "project"("trackingCode");

-- CreateIndex
CREATE INDEX "project_createdAt_idx" ON "project"("createdAt");

-- CreateIndex
CREATE INDEX "project_userId_status_idx" ON "project"("userId", "status");

-- CreateIndex
CREATE INDEX "project_status_createdAt_idx" ON "project"("status", "createdAt");

-- CreateIndex
CREATE INDEX "project_category_status_idx" ON "project"("category", "status");

-- CreateIndex
CREATE INDEX "project_status_history_projectId_idx" ON "project_status_history"("projectId");

-- CreateIndex
CREATE INDEX "community_topic_userId_idx" ON "community_topic"("userId");

-- CreateIndex
CREATE INDEX "community_topic_category_idx" ON "community_topic"("category");

-- CreateIndex
CREATE INDEX "community_topic_createdAt_idx" ON "community_topic"("createdAt");

-- CreateIndex
CREATE INDEX "community_topic_like_topicId_idx" ON "community_topic_like"("topicId");

-- CreateIndex
CREATE INDEX "community_topic_like_userId_idx" ON "community_topic_like"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_topic_like_topicId_userId_key" ON "community_topic_like"("topicId", "userId");

-- CreateIndex
CREATE INDEX "community_reply_topicId_idx" ON "community_reply"("topicId");

-- CreateIndex
CREATE INDEX "community_reply_userId_idx" ON "community_reply"("userId");

-- CreateIndex
CREATE INDEX "community_reply_parentId_idx" ON "community_reply"("parentId");

-- CreateIndex
CREATE INDEX "report_userId_idx" ON "report"("userId");

-- CreateIndex
CREATE INDEX "report_contentType_contentId_idx" ON "report"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "notification_userId_idx" ON "notification"("userId");

-- CreateIndex
CREATE INDEX "notification_read_idx" ON "notification"("read");

-- CreateIndex
CREATE INDEX "notification_createdAt_idx" ON "notification"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "page_name_idx" ON "page"("name");

-- CreateIndex
CREATE INDEX "page_parentId_idx" ON "page"("parentId");

-- CreateIndex
CREATE INDEX "page_item_pageId_idx" ON "page_item"("pageId");

-- CreateIndex
CREATE INDEX "review_assignment_projectId_idx" ON "review_assignment"("projectId");

-- CreateIndex
CREATE INDEX "review_assignment_reviewerId_idx" ON "review_assignment"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "review_assignment_projectId_reviewerId_key" ON "review_assignment"("projectId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "coi_declaration_assignmentId_key" ON "coi_declaration"("assignmentId");

-- CreateIndex
CREATE INDEX "coi_declaration_userId_idx" ON "coi_declaration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_report_assignmentId_key" ON "evaluation_report"("assignmentId");

-- CreateIndex
CREATE INDEX "evaluation_report_reviewerId_idx" ON "evaluation_report"("reviewerId");

-- CreateIndex
CREATE INDEX "committee_session_sessionDate_idx" ON "committee_session"("sessionDate");

-- CreateIndex
CREATE INDEX "committee_session_status_idx" ON "committee_session"("status");

-- CreateIndex
CREATE UNIQUE INDEX "appeal_projectId_key" ON "appeal"("projectId");

-- CreateIndex
CREATE INDEX "appeal_appellantId_idx" ON "appeal"("appellantId");

-- CreateIndex
CREATE UNIQUE INDEX "aar_application_projectId_key" ON "aar_application"("projectId");

-- CreateIndex
CREATE INDEX "aar_application_applicantId_idx" ON "aar_application"("applicantId");

-- CreateIndex
CREATE INDEX "sae_report_projectId_idx" ON "sae_report"("projectId");

-- CreateIndex
CREATE INDEX "sae_report_reporterId_idx" ON "sae_report"("reporterId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_like" ADD CONSTRAINT "comment_like_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_like" ADD CONSTRAINT "comment_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like" ADD CONSTRAINT "like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like" ADD CONSTRAINT "like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_status_history" ADD CONSTRAINT "project_status_history_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_topic" ADD CONSTRAINT "community_topic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_topic_like" ADD CONSTRAINT "community_topic_like_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "community_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_topic_like" ADD CONSTRAINT "community_topic_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reply" ADD CONSTRAINT "community_reply_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "community_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reply" ADD CONSTRAINT "community_reply_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "community_reply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reply" ADD CONSTRAINT "community_reply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page" ADD CONSTRAINT "page_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_item" ADD CONSTRAINT "page_item_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignment" ADD CONSTRAINT "review_assignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignment" ADD CONSTRAINT "review_assignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coi_declaration" ADD CONSTRAINT "coi_declaration_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "review_assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coi_declaration" ADD CONSTRAINT "coi_declaration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_report" ADD CONSTRAINT "evaluation_report_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "review_assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_report" ADD CONSTRAINT "evaluation_report_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeal" ADD CONSTRAINT "appeal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeal" ADD CONSTRAINT "appeal_appellantId_fkey" FOREIGN KEY ("appellantId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aar_application" ADD CONSTRAINT "aar_application_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aar_application" ADD CONSTRAINT "aar_application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sae_report" ADD CONSTRAINT "sae_report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sae_report" ADD CONSTRAINT "sae_report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

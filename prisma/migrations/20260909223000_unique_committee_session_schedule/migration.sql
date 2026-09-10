-- Prevent duplicate committee sessions when the create action is retried or races.
CREATE UNIQUE INDEX "committee_session_sessionType_sessionDate_key"
ON "committee_session"("sessionType", "sessionDate");

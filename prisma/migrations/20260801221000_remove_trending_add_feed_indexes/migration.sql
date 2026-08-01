DROP MATERIALIZED VIEW IF EXISTS mv_trending_tags CASCADE;

CREATE INDEX IF NOT EXISTS "comment_postId_deleted_parentId_createdAt_idx"
    ON "comment"("postId", "deleted", "parentId", "createdAt");

CREATE INDEX IF NOT EXISTS "like_postId_createdAt_idx"
    ON "like"("postId", "createdAt");

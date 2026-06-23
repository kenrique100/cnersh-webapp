CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE MATERIALIZED VIEW mv_trending_tags AS
WITH normalized AS (
    SELECT
        LOWER(TRIM(u.tag)) AS tag_norm,
        p.created_at AS post_created_at
    FROM post p
    CROSS JOIN LATERAL unnest(p.tags) AS u(tag)
    WHERE p.deleted = false
      AND TRIM(u.tag) <> ''
      AND p.created_at > NOW() - INTERVAL '30 days'
      AND LOWER(TRIM(u.tag)) NOT IN (
          'fyp','viral','trending','new','post','video',
          'photo','reel','share','like','follow','explore'
      )
),
aggregated AS (
    SELECT
        tag_norm,
        COUNT(*)                                                          AS raw_count,
        MAX(post_created_at)                                              AS last_used_at,
        COUNT(*)::float / POWER(
            EXTRACT(EPOCH FROM (NOW() - MAX(post_created_at))) / 3600.0 + 2,
            1.8
        )                                                                 AS score
    FROM normalized
    GROUP BY tag_norm
    HAVING COUNT(*) >= 3
)
SELECT tag_norm, raw_count AS count, last_used_at, score
FROM aggregated
ORDER BY score DESC, raw_count DESC
WITH DATA;

CREATE UNIQUE INDEX idx_mv_trending_tag_norm ON mv_trending_tags (tag_norm);
CREATE INDEX idx_mv_trending_score       ON mv_trending_tags (score DESC);
CREATE INDEX idx_mv_trending_count       ON mv_trending_tags (count DESC);

SELECT cron.schedule(
               'refresh-trending-tags',
               '*/2 * * * *',
               $$ REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_tags; $$
);
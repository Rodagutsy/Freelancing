-- 20_multi_persona_scores.sql — Show every persona's score per job
-- Run AFTER: 17_multi_user_rls.sql (needs job_scores.user_id).
--
-- Before this patch only the single latest score across all personas was
-- surfaced (one row per job in job_feed). Now:
--   * job_scores gains a per-(user, job, persona) uniqueness so re-scoring a
--     persona UPDATES its score instead of stacking duplicate rows.
--   * job_feed.score_* columns expose the BEST score across personas, and a new
--     persona_scores JSONB column carries the latest score for every persona.
--   * a job_persona_scores view supports filtering jobs by a chosen persona.
--
-- Safe to re-run.

-- 1. Collapse duplicate scores: keep only the newest row per (job, persona) ---
DELETE FROM job_scores a
USING job_scores b
WHERE a.job_id = b.job_id
  AND a.profile_id = b.profile_id
  AND (
    a.created_at < b.created_at
    OR (a.created_at = b.created_at AND a.id < b.id)
  );

-- 2. One row per (user, job, persona) — enables upsert ----------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_scores_job_persona
  ON job_scores (user_id, job_id, profile_id);

-- 3. Recreate job_feed: best score across personas + per-persona breakdown ---
DROP VIEW IF EXISTS job_feed;
CREATE VIEW job_feed AS
SELECT
  j.id,
  j.source,
  j.user_id,
  j.raw_payload,
  j.title,
  j.description,
  j.skills_requested,
  j.budget_min,
  j.budget_max,
  j.budget_type,
  j.client_rating,
  j.client_reviews_count,
  j.client_jobs_posted,
  j.client_hire_rate,
  j.proposals_count,
  j.posted_at,
  j.url,
  j.ingested_at,
  j.skipped_at,
  j.skip_reason,
  j.company_name,
  j.location,
  j.is_remote,

  -- best score across personas (keeps list filters/sorting/dashboard working)
  s.id         AS score_id,
  s.score_total,
  s.confidence,
  s.recommendation,
  s.explanation,
  s.factors,
  s.created_at AS score_created_at,
  s.profile_id AS score_profile_id,

  -- per-persona breakdown: [{profile_id,label,pillar,score_total,recommendation,confidence}]
  ps.persona_scores,
  COALESCE(ps.persona_score_count, 0) AS persona_score_count,

  -- latest proposal (highest version)
  p.id            AS proposal_id,
  p.draft_text    AS proposal_draft_text,
  p.angle         AS proposal_angle,
  p.used_projects AS proposal_used_projects,
  p.version       AS proposal_version

FROM jobs j
LEFT JOIN LATERAL (
  SELECT best.* FROM (
    SELECT DISTINCT ON (profile_id) *
    FROM job_scores
    WHERE job_scores.job_id = j.id
    ORDER BY profile_id, created_at DESC
  ) best
  ORDER BY best.score_total DESC, best.created_at DESC
  LIMIT 1
) s ON TRUE
LEFT JOIN LATERAL (
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'profile_id', lp.profile_id,
        'label', pr.label,
        'pillar', pr.pillar,
        'score_total', lp.score_total,
        'recommendation', lp.recommendation,
        'confidence', lp.confidence
      )
      ORDER BY lp.score_total DESC
    ) AS persona_scores,
    count(*) AS persona_score_count
  FROM (
    SELECT DISTINCT ON (profile_id) *
    FROM job_scores
    WHERE job_scores.job_id = j.id
    ORDER BY profile_id, created_at DESC
  ) lp
  JOIN profiles pr ON pr.id = lp.profile_id
) ps ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM proposals
  WHERE proposals.job_id = j.id
  ORDER BY version DESC, created_at DESC
  LIMIT 1
) p ON TRUE;

ALTER VIEW job_feed SET (security_invoker = on);
GRANT SELECT ON job_feed TO authenticated;

-- 4. Latest score per (job, persona) — used to filter the list by persona ----
DROP VIEW IF EXISTS job_persona_scores;
CREATE VIEW job_persona_scores AS
SELECT DISTINCT ON (js.job_id, js.profile_id)
  js.job_id,
  js.user_id,
  js.profile_id,
  js.score_total,
  js.confidence,
  js.recommendation,
  js.created_at
FROM job_scores js
ORDER BY js.job_id, js.profile_id, js.created_at DESC;

ALTER VIEW job_persona_scores SET (security_invoker = on);
GRANT SELECT ON job_persona_scores TO authenticated;

-- 22_score_floor_and_recency.sql — Persona-wide score floor + stale-job purge
-- Run AFTER: 20_multi_persona_scores.sql.
--
-- Why: the jobs list surfaced each job's BEST persona score, so a job that fit
-- one persona but flopped every other persona still showed up, and nothing ever
-- enforced a minimum fit. This patch adds job_feed.min_persona_score (the
-- LOWEST of each persona's latest score) so the list can hide any job that
-- scores below the floor for ANY persona. It also purges stale jobs (> 60 days)
-- that were never acted on.
--
-- Safe to re-run.

-- 1. Rebuild job_feed with min_persona_score ---------------------------------
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

  -- per-persona breakdown + the floor used to hide poor-fit-for-any jobs
  ps.min_persona_score,
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
    count(*) AS persona_score_count,
    min(lp.score_total) AS min_persona_score
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

-- 2. Purge stale, never-actioned jobs ----------------------------------------
-- Deletes untouched leads older than 60 days. Jobs with a proposal or an
-- application are preserved (they represent real work), as are the cascade of
-- their scores/proposals. Adjust the interval to taste.
DELETE FROM jobs j
WHERE j.posted_at < now() - interval '60 days'
  AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.job_id = j.id)
  AND NOT EXISTS (SELECT 1 FROM proposals p WHERE p.job_id = j.id);

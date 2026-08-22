-- Upwork Radar — Read-model views (V1)
-- Run AFTER supabase_migrations.sql, 00_extensions.sql, AND 01_rls_policies.sql.
--
-- job_feed: jobs joined with their latest score and latest proposal.
-- The dashboard and jobs list query this view directly, keeping filters
-- and pagination server-side via PostgREST.

CREATE OR REPLACE VIEW job_feed AS
SELECT
  j.id,
  j.source,
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

  -- latest score
  s.id         AS score_id,
  s.score_total,
  s.confidence,
  s.recommendation,
  s.explanation,
  s.factors,
  s.created_at AS score_created_at,

  -- latest proposal (highest version)
  p.id            AS proposal_id,
  p.draft_text    AS proposal_draft_text,
  p.angle         AS proposal_angle,
  p.used_projects AS proposal_used_projects,
  p.version       AS proposal_version

FROM jobs j
LEFT JOIN LATERAL (
  SELECT * FROM job_scores
  WHERE job_scores.job_id = j.id
  ORDER BY created_at DESC
  LIMIT 1
) s ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM proposals
  WHERE proposals.job_id = j.id
  ORDER BY version DESC, created_at DESC
  LIMIT 1
) p ON TRUE;

-- security_invoker: RLS of the underlying tables applies to the caller.
ALTER VIEW job_feed SET (security_invoker = on);

-- Grant: the authenticated role can read the view (RLS still filters rows).
GRANT SELECT ON job_feed TO authenticated;
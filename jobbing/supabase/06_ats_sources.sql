-- 06_ats_sources.sql — ATS Radar: watched companies + jobs schema changes
-- Run AFTER: 05_personas.sql
--
-- Adds:
--   watched_companies table (companies whose public ATS boards we poll)
--   Extend jobs.source CHECK to include 'ats_api'
--   Extend jobs.budget_type CHECK to include 'salary'
--   New columns on jobs: company_name, location, is_remote
--   Recreate job_feed view with the new columns

-- 1. watched_companies -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS watched_companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  platform     TEXT NOT NULL CHECK (platform IN (
    'greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters',
    'personio', 'recruitee', 'unknown'
  )),
  board_token  TEXT,            -- API token / board id used by the ATS API
  careers_url  TEXT NOT NULL,
  region       TEXT NOT NULL DEFAULT 'us' CHECK (region IN ('us', 'eu')),
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watched_companies_url
  ON watched_companies (careers_url);

-- RLS
ALTER TABLE watched_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access on watched_companies"
  ON watched_companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Extend jobs CHECKs ----------------------------------------------------------

-- Drop the old source CHECK, add 'ats_api'
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_source_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_source_check
  CHECK (source IN ('upwork_email', 'upwork_api', 'ats_api'));

-- Drop the old budget_type CHECK, add 'salary'
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_budget_type_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_budget_type_check
  CHECK (budget_type IN ('fixed', 'hourly', 'salary'));

-- 3. New columns on jobs ---------------------------------------------------------

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_remote BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_jobs_company_name ON jobs(company_name);

-- 4. Recreate job_feed with new columns ------------------------------------------

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
  j.company_name,
  j.location,
  j.is_remote,

  -- latest score
  s.id         AS score_id,
  s.score_total,
  s.confidence,
  s.recommendation,
  s.explanation,
  s.factors,
  s.created_at AS score_created_at,
  s.profile_id AS score_profile_id,

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

ALTER VIEW job_feed SET (security_invoker = on);
GRANT SELECT ON job_feed TO authenticated;

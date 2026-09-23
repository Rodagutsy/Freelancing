-- 05_personas.sql — Multi-persona profiles (Part A)
-- Run AFTER: supabase_migrations.sql -> 00_extensions -> 01_rls_policies -> 02_views -> 03_seed -> 04_portfolio_links
--
-- profiles becomes multi-row: each row is a "persona" (label + pillar) that jobs
-- can be scored against and proposals drafted from. Portfolio stays SHARED across
-- personas (portfolio_projects is not touched here).
--
-- Columns added: label, pillar (design|build|automation|growth), is_default, sort_order.
-- All IF NOT EXISTS / guarded so this patch is safe to re-run.

-- 1. New columns -----------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS pillar TEXT
    CHECK (pillar IN ('design', 'build', 'automation', 'growth')),
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- At most one default persona at any time.
-- (setDefault flows clear all flags before setting one; the index only blocks
--  two rows being default simultaneously.)
DROP INDEX IF EXISTS idx_profiles_single_default;
CREATE UNIQUE INDEX idx_profiles_single_default ON profiles ((1)) WHERE is_default;

-- Helpful ordering for listings.
CREATE INDEX IF NOT EXISTS idx_profiles_sort_order ON profiles(sort_order);

-- 2. Existing row becomes the "Primary" persona and stays the default ------------

UPDATE profiles
SET label   = COALESCE(label, 'Primary'),
    pillar  = COALESCE(pillar, 'automation'),
    is_default = true,
    sort_order = 0
WHERE id IN (
  SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1
);

-- Any other pre-existing rows (shouldn't happen today) keep their name as label.
UPDATE profiles SET label = COALESCE(label, name) WHERE label IS NULL;

-- 3. Seed the four starter personas ----------------------------------------------
-- Empty by design: fill each one in via Settings (label, headline, bio, services,
-- niches, rates, links). name/headline are NOT NULL in the base schema, so they
-- start as readable placeholders.

INSERT INTO profiles (name, headline, bio, services, niches, label, pillar, is_default, sort_order)
VALUES
  ('Product Design',          '', NULL, '{}', '{}', 'Product Design',           'design',     false, 10),
  ('AI Product Builder',      '', NULL, '{}', '{}', 'AI Product Builder',       'build',      false, 20),
  ('Automation & Integrations','', NULL, '{}', '{}', 'Automation & Integrations','automation', false, 30),
  ('Ads & Growth',            '', NULL, '{}', '{}', 'Ads & Growth',             'growth',     false, 40)
ON CONFLICT DO NOTHING;

-- 4. job_feed: expose which persona produced the latest score --------------------
-- (The proposal panel defaults its persona selector to this id.)
-- Column is appended; 06_ats_sources.sql recreates the full view later with the
-- ATS columns — both patches are order-safe.

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

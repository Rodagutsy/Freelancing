-- 21_ats_scrape.sql — In-app ATS scraping bookkeeping + catalog defaults
-- Run AFTER: 06_ats_sources.sql (and 17_multi_user_rls.sql for user_id).
--
-- The app now polls ATS boards itself (see src/lib/services/atsIntake.ts and
-- /api/intake/run), so watched_companies needs a little poll bookkeeping.
--
-- The ~9,935 companies seeded by 09_seed_ats_companies_part01..10 are treated
-- as a searchable CATALOG: this patch deactivates them all, then re-activates
-- the curated starter watchlist from 07_seed_watchlist.sql. Activate more from
-- Settings -> Watched Companies.
--
-- Safe to re-run.

ALTER TABLE watched_companies
  ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_status TEXT,
  ADD COLUMN IF NOT EXISTS last_jobs_found INT,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Fast "next due companies" selection for the scraper.
CREATE INDEX IF NOT EXISTS idx_watched_companies_due
  ON watched_companies (user_id, active, last_polled_at);

-- Catalog defaults: deactivate everything, then bring back the starter list.
UPDATE watched_companies SET active = false;
UPDATE watched_companies SET active = true
WHERE careers_url IN (
  'https://boards.greenhouse.io/anthropic',
  'https://boards.greenhouse.io/mistralai',
  'https://boards.greenhouse.io/huggingface',
  'https://boards.greenhouse.io/figma',
  'https://jobs.lever.co/canva',
  'https://jobs.ashbyhq.com/n8n',
  'https://jobs.lever.co/zapier',
  'https://www.make.com/careers',
  'https://boards.greenhouse.io/vercel',
  'https://boards.greenhouse.io/hubspot',
  'https://career.smartrecruiters.com/Brevo',
  'https://jobs.ashbyhq.com/attio',
  'https://boards.greenhouse.io/supabase',
  'https://boards.greenhouse.io/linear'
);

-- Upwork Radar — Schema extensions (V1)
-- Run AFTER supabase_migrations.sql, BEFORE 02_views.sql.
--
-- Adds the skipped-state columns consumed by the dashboard's skip feature.
-- Columns use IF NOT EXISTS so this is safe to re-run.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skip_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_skipped_at ON jobs(skipped_at);

-- Natural-key upsert support: n8n inserts jobs with PostgREST
-- `Prefer: resolution=merge-duplicates` keyed on this unique url.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_url_unique ON jobs(url);
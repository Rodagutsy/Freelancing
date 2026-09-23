-- 18_rate_limits.sql — Server-side fixed-window rate limiting
-- Run AFTER: 17_multi_user_rls.sql
--
-- Single table of fixed-window counters. There are NO RLS policies on
-- purpose: authenticated/anon clients are DENIED entirely (row level
-- security with no policies), so only the service-role client (used by
-- src/lib/security/rateLimit.ts on the server) can read/write it.
--
-- A 30-day retention sweep removes windows that have aged out, so the table
-- can't grow without bound. Run it on a schedule (pg_cron / n8n) or manually.

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key   TEXT PRIMARY KEY,
  hits         INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table owner is the postgres role; service role inherits privileges, so no
-- grants are needed. Explicitly deny anything accidental:
REVOKE ALL ON rate_limits FROM anon, authenticated;

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- One-time cleanup for buckets unused for > 30 days.
DELETE FROM rate_limits WHERE window_start < now() - interval '30 days';
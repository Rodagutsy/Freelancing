-- Upwork Radar — Security & RLS (V1)
-- Run AFTER supabase_migrations.sql in the Supabase SQL Editor.
--
-- Goal: anon role denied by default; authenticated role has full access
-- (single-user V1). Public dashboard tables must never be readable without
-- a signed-in session.

-- 1. Enable RLS on every table
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_review_queue ENABLE ROW LEVEL SECURITY;

-- 2. Policies: authenticated role has full access; anon has none.
--    (When a table has no policy for a role, Postgres denies that role.)

CREATE POLICY "authenticated full access profiles"
  ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access portfolio_projects"
  ON portfolio_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access jobs"
  ON jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access job_scores"
  ON job_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access proposals"
  ON proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access applications"
  ON applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access manual_review_queue"
  ON manual_review_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Sanity check: anon should be denied on everything.
--    Test with: select has_table_privilege('anon', 'jobs', 'SELECT');  -- false
-- 17_multi_user_rls.sql — Multi-user data isolation
-- Run AFTER: 16_outbound_message_feed.sql (and after the first auth user exists;
-- see "Fresh installs" note below).
--
-- Converts the single-tenant schema ("authenticated full access") into
-- per-user data isolation:
--   * Adds a user_id column (FK -> auth.users) to every app table.
--   * Backfills existing rows to the owner account (earliest-created auth user).
--   * Makes user_id NOT NULL DEFAULT auth.uid() so app-side inserts are scoped
--     automatically.
--   * Replaces the `USING (true) WITH CHECK (true)` policies with
--     `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`.
--   * Fixes global uniqueness constraints that break multi-user (persona
--     default, job url, sequence name, suppression email, watched url).
--   * Adds user_id to the read-model view columns so n8n/service-role
--     automation can filter to a single owner.
--
-- IMPORTANT — service-role automation (n8n) bypasses RLS and has no JWT
-- session, so `auth.uid()` is NULL for it. Every n8n insert MUST pass
-- `user_id` explicitly (the workflows now use $env.OWNER_USER_ID).
--
-- Fresh installs: run this file AFTER creating your first auth user, so the
-- backfill has an owner. If auth.users is empty the script warns and leaves
-- user_id NULLABLE — re-run it after your first sign-in.

-- 0. Tables that get user_id (every app table) ---------------------------------

-- 1. Add columns (nullable first so the backfill can populate them) ------------

ALTER TABLE profiles            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE portfolio_projects  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE jobs                ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE job_scores          ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE proposals           ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE applications        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE manual_review_queue ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE watched_companies   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE audits                    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE audit_pages               ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE audit_technologies        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE audit_issues              ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE audit_opportunities       ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE audit_opportunity_services ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE prospects                 ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE prospect_audits           ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE email_sequences     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE outbounds           ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE outbound_messages   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE suppressed_contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill to the owner account (earliest-created auth user) -----------------

DO $$
DECLARE
  owner_id UUID;
  t TEXT;
  upgraded BOOLEAN := false;
BEGIN
  SELECT id INTO owner_id FROM auth.users ORDER BY created_at ASC, id ASC LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE NOTICE 'No auth users exist yet — user_id columns left NULLABLE. Re-run this script after the first account is created.';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'profiles','portfolio_projects','jobs','job_scores','proposals','applications',
    'manual_review_queue','watched_companies','audits','audit_pages',
    'audit_technologies','audit_issues','audit_opportunities',
    'audit_opportunity_services','prospects','prospect_audits',
    'email_sequences','outbounds','outbound_messages','suppressed_contacts'
  ] LOOP
    EXECUTE format(
      'UPDATE %I SET user_id = %L WHERE user_id IS NULL', t, owner_id
    );
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid()', t
    );
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_user_id', t)
    ) THEN
      EXECUTE format('CREATE INDEX idx_%I_user_id ON %I(user_id)', t, t);
    END IF;
    upgraded := true;
  END LOOP;

  IF upgraded THEN
    RAISE NOTICE 'user_id added, backfilled to % and enforced NOT NULL on all app tables.', owner_id;
  END IF;
END
$$;

-- 3. Drop the old "full access" policies and create owner-scoped ones -----------

DO $$
DECLARE
  t TEXT;
  pol TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','portfolio_projects','jobs','job_scores','proposals','applications',
    'manual_review_queue','watched_companies','audits','audit_pages',
    'audit_technologies','audit_issues','audit_opportunities',
    'audit_opportunity_services','prospects','prospect_audits',
    'email_sequences','outbounds','outbound_messages','suppressed_contacts'
  ] LOOP
    -- Drop every existing policy on the table (single-user era policies).
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY user_is_owner ON %I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t
    );
  END LOOP;
END
$$;

-- 4. Fix global uniqueness constraints so they are per-user ---------------------

DROP INDEX IF EXISTS idx_profiles_single_default;
CREATE UNIQUE INDEX idx_profiles_single_default_per_user
  ON profiles (user_id) WHERE is_default;

DROP INDEX IF EXISTS idx_jobs_url_unique;
CREATE UNIQUE INDEX idx_jobs_url_unique_per_user ON jobs (user_id, url);

DROP INDEX IF EXISTS idx_email_sequences_name;
CREATE UNIQUE INDEX idx_email_sequences_name_per_user ON email_sequences (user_id, name);

DROP INDEX IF EXISTS idx_suppressed_contacts_email;
CREATE UNIQUE INDEX idx_suppressed_contacts_email_per_user ON suppressed_contacts (user_id, email);

DROP INDEX IF EXISTS idx_watched_companies_url;
CREATE UNIQUE INDEX idx_watched_companies_url_per_user ON watched_companies (user_id, careers_url);

-- The "one active campaign per prospect" constraint stays global-by-prospect:
-- a prospect belongs to one user, so prospect_id is already unique per owner.

-- 5. Storage: scope audit-screenshots to the owner's folder (like portfolio) ----

DROP POLICY IF EXISTS "Authenticated upload audit screenshots" ON storage.objects;
CREATE POLICY "Authenticated upload audit screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audit-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated delete audit screenshots" ON storage.objects;
CREATE POLICY "Authenticated delete audit screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'audit-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated update audit screenshots" ON storage.objects;
CREATE POLICY "Authenticated update audit screenshots"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'audit-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read stays (screenshots are rendered as <img> URLs and the filenames
-- contain unguessable UUIDs). Revisit if the bucket ever holds sensitive data.

-- 6. Add user_id to the read-model views so service-role automation + the app
--    can filter to a single owner. RLS (security_invoker) still scopes rows
--    for authenticated callers; these columns are for n8n's owner filtering.
--
-- NOTE: user_id is inserted mid-column-list, so CREATE OR REPLACE VIEW would
-- fail with 42P16 ("cannot change name of view column"). The views are dropped
-- and recreated instead (nothing depends on them database-side).

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

DROP VIEW IF EXISTS outbound_feed;
CREATE VIEW outbound_feed AS
SELECT
  o.id,
  o.prospect_id,
  o.user_id,
  o.status,
  o.current_step,
  o.steps,
  o.personalization_angle,
  o.confidence,
  o.subscribed,
  o.version,
  o.reply_classification,
  o.sent_at,
  o.replied_at,
  o.created_at,
  o.updated_at,

  p.company_name,
  p.contact_email,
  p.contact_name,
  p.contact_type,
  p.industry,
  p.location,
  p.website_score,
  p.automation_score,
  p.pipeline_status,
  p.reason_for_contact

FROM outbounds o
JOIN prospects p ON p.id = o.prospect_id;

ALTER VIEW outbound_feed SET (security_invoker = on);
GRANT SELECT ON outbound_feed TO authenticated;

DROP VIEW IF EXISTS outbound_message_feed;
CREATE VIEW outbound_message_feed AS
SELECT
  m.id                          AS id,
  m.outbound_id,
  o.user_id,
  m.step_no,
  m.subject,
  m.body,
  m.status                      AS message_status,
  m.message_id                  AS provider_message_id,
  m.provider,
  m.error,
  m.sent_at,
  m.opened_at,
  m.created_at                  AS message_created_at,

  o.status                      AS outbound_status,
  o.current_step,
  o.steps,
  o.sent_at                     AS outbound_sent_at,

  p.id                          AS prospect_id,
  p.company_name,
  p.contact_name,
  p.contact_email,
  p.industry,
  p.location

FROM outbound_messages m
JOIN outbounds o    ON o.id = m.outbound_id
JOIN prospects p    ON p.id = o.prospect_id;

ALTER VIEW outbound_message_feed SET (security_invoker = on);
GRANT SELECT ON outbound_message_feed TO authenticated;

-- 7. Sanity check guard: this should return only owner-scoped rows.
--    select id, url, user_id from jobs limit 5;
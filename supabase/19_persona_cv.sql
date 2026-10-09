-- 19_persona_cv.sql — Per-persona master CV
-- Run AFTER: 17_multi_user_rls.sql (and 18_rate_limits.sql; order-independent with 20/21).
--
-- Each persona can store a "master CV" (the raw text extracted from an uploaded
-- PDF/text file). The text is the source for per-job tailored CV generation and
-- for auto-filling the persona's profile fields.
--
-- Safe to re-run.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS master_cv_text TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS master_cv_filename TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS master_cv_uploaded_at TIMESTAMPTZ;

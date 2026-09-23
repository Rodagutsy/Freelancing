-- 04_portfolio_links.sql
-- Run AFTER: supabase_migrations.sql -> 00_extensions.sql -> 01_rls_policies.sql -> 02_views.sql
-- Adds profile presence links, portfolio image uploads (Supabase Storage),
-- and import provenance for portfolio entries.

-- 1. Profile links (the proposal AI may cite these selectively as proof)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS behance_url TEXT,
  ADD COLUMN IF NOT EXISTS pinterest_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS upwork_profile_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- 2. Portfolio project images + where the entry was imported from
ALTER TABLE portfolio_projects
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- 3. Storage bucket for portfolio images (public read, per-user write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read portfolio images" ON storage.objects;
CREATE POLICY "public read portfolio images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'portfolio-images');

-- Authenticated users manage only their own folder: {auth.uid()}/...
DROP POLICY IF EXISTS "authenticated insert own portfolio images" ON storage.objects;
CREATE POLICY "authenticated insert own portfolio images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "authenticated delete own portfolio images" ON storage.objects;
CREATE POLICY "authenticated delete own portfolio images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "authenticated update own portfolio images" ON storage.objects;
CREATE POLICY "authenticated update own portfolio images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

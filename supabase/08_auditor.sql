-- 08_auditor.sql — Website Auditor & Prospect Intelligence Engine
-- Run AFTER: 07_seed_watchlist.sql
--
-- Tables: audits, audit_pages, audit_technologies, audit_issues,
--         audit_opportunities, audit_opportunity_services,
--         prospects, prospect_audits
-- Storage: audit-screenshots bucket

-- 0. Storage bucket for audit screenshots -----------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-screenshots', 'audit-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage.objects (authenticated can write, public can read, auth can delete)
DROP POLICY IF EXISTS "Authenticated upload audit screenshots" ON storage.objects;
CREATE POLICY "Authenticated upload audit screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audit-screenshots');

DROP POLICY IF EXISTS "Public read audit screenshots" ON storage.objects;
CREATE POLICY "Public read audit screenshots"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'audit-screenshots');

DROP POLICY IF EXISTS "Authenticated delete audit screenshots" ON storage.objects;
CREATE POLICY "Authenticated delete audit screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audit-screenshots');

-- 1. Audit status enum (as CHECK constraint) --------------------------------------

-- 2. audits — top-level audit record ------------------------------------------------

CREATE TABLE IF NOT EXISTS audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url             TEXT NOT NULL,
  business_name   TEXT,
  industry        TEXT,
  location        TEXT,
  status          TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN (
      'created', 'queued', 'crawling', 'analyzing',
      'scoring', 'opportunities', 'completed', 'failed', 'cancelled'
    )),
  error_message   TEXT,

  -- scores (0-100)
  overall_score       INT CHECK (overall_score BETWEEN 0 AND 100),
  automation_score    INT CHECK (automation_score BETWEEN 0 AND 100),
  ui_score            INT CHECK (ui_score BETWEEN 0 AND 100),
  ux_score            INT CHECK (ux_score BETWEEN 0 AND 100),
  performance_score   INT CHECK (performance_score BETWEEN 0 AND 100),
  accessibility_score INT CHECK (accessibility_score BETWEEN 0 AND 100),
  seo_score           INT CHECK (seo_score BETWEEN 0 AND 100),
  conversion_score    INT CHECK (conversion_score BETWEEN 0 AND 100),

  raw_crawl_data  JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at DESC);

-- 3. audit_pages — per-page crawl results ------------------------------------------

CREATE TABLE IF NOT EXISTS audit_pages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id              UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  url                   TEXT NOT NULL,
  path                  TEXT,
  title                 TEXT,
  screenshot_desktop_url TEXT,
  screenshot_mobile_url  TEXT,

  -- Lighthouse / Core Web Vitals
  lighthouse_score      INT CHECK (lighthouse_score BETWEEN 0 AND 100),
  lcp_ms                FLOAT,
  cls                   FLOAT,
  inp_ms                FLOAT,
  ttfb_ms               FLOAT,

  -- Accessibility
  axe_violations_count  INT DEFAULT 0,
  axe_violations        JSONB DEFAULT '[]'::jsonb,

  -- SEO per-page
  seo_score             INT CHECK (seo_score BETWEEN 0 AND 100),
  seo_data              JSONB DEFAULT '{}'::jsonb,

  -- DOM snapshot
  dom_snapshot          JSONB DEFAULT '{}'::jsonb,

  -- Errors
  console_errors        JSONB DEFAULT '[]'::jsonb,

  crawled_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_pages_audit ON audit_pages(audit_id);

-- 4. audit_technologies — detected tech stack --------------------------------------

CREATE TABLE IF NOT EXISTS audit_technologies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id    UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'cms', 'framework', 'crm', 'analytics', 'forms', 'booking',
      'ecommerce', 'chat', 'email', 'payment', 'cdn', 'other'
    )),
  confidence  FLOAT NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  evidence    TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_tech_audit ON audit_technologies(audit_id);

-- 5. audit_issues — problems found across the site ---------------------------------

CREATE TABLE IF NOT EXISTS audit_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id        UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  page_id         UUID REFERENCES audit_pages(id) ON DELETE SET NULL,
  category        TEXT NOT NULL
    CHECK (category IN (
      'ux', 'ui', 'performance', 'accessibility', 'seo',
      'conversion', 'technical'
    )),
  severity        TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  evidence        TEXT,
  recommendation  TEXT,
  classification  TEXT NOT NULL DEFAULT 'observed'
    CHECK (classification IN ('observed', 'inferred', 'confirmed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_issues_audit ON audit_issues(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_issues_severity ON audit_issues(severity);

-- 6. audit_opportunities — automation & improvement opportunities ------------------

CREATE TABLE IF NOT EXISTS audit_opportunities (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id                UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  category                TEXT NOT NULL
    CHECK (category IN (
      'lead_capture', 'appointment', 'crm', 'ecommerce', 'email',
      'whatsapp', 'support', 'quote', 'internal_workflow', 'ai_agent',
      'seo', 'performance', 'ui_ux', 'other'
    )),
  observed_signal         TEXT NOT NULL,
  evidence                TEXT NOT NULL,
  inference               TEXT,
  confidence              FLOAT NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  business_impact         TEXT NOT NULL DEFAULT 'medium'
    CHECK (business_impact IN ('high', 'medium', 'low')),
  automation_potential    TEXT NOT NULL DEFAULT 'medium'
    CHECK (automation_potential IN ('high', 'medium', 'low')),
  estimated_complexity    TEXT NOT NULL DEFAULT 'moderate'
    CHECK (estimated_complexity IN ('simple', 'moderate', 'complex')),
  recommended_tools       TEXT[] DEFAULT '{}',
  recommended_workflow    TEXT,
  implementation_notes    TEXT,
  outreach_angle          TEXT,
  score                   INT CHECK (score BETWEEN 0 AND 100),
  classification          TEXT NOT NULL DEFAULT 'observed'
    CHECK (classification IN ('observed', 'inferred', 'confirmed')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_opps_audit ON audit_opportunities(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_opps_score ON audit_opportunities(score DESC NULLS LAST);

-- 7. audit_opportunity_services — service recommendations per opportunity ----------

CREATE TABLE IF NOT EXISTS audit_opportunity_services (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id      UUID NOT NULL REFERENCES audit_opportunities(id) ON DELETE CASCADE,
  service_name        TEXT NOT NULL,
  service_description TEXT,
  estimated_hours     INT
);

CREATE INDEX IF NOT EXISTS idx_audit_opp_svc_opp ON audit_opportunity_services(opportunity_id);

-- 8. prospects — businesses being tracked ------------------------------------------

CREATE TABLE IF NOT EXISTS prospects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT NOT NULL,
  website_url     TEXT,
  industry        TEXT,
  location        TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  source          TEXT,
  website_score   INT CHECK (website_score BETWEEN 0 AND 100),
  automation_score INT CHECK (automation_score BETWEEN 0 AND 100),
  technology_stack TEXT[] DEFAULT '{}',
  pipeline_status TEXT NOT NULL DEFAULT 'prospecting'
    CHECK (pipeline_status IN (
      'prospecting', 'contacted', 'proposal_sent',
      'negotiating', 'won', 'lost'
    )),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_prospects_created ON prospects(created_at DESC);

-- 9. prospect_audits — linking table -----------------------------------------------

CREATE TABLE IF NOT EXISTS prospect_audits (
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  audit_id    UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (prospect_id, audit_id)
);

-- 10. RLS policies ----------------------------------------------------------------

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_opportunity_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access on audits" ON audits;
CREATE POLICY "Authenticated full access on audits"
  ON audits FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on audit_pages" ON audit_pages;
CREATE POLICY "Authenticated full access on audit_pages"
  ON audit_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on audit_technologies" ON audit_technologies;
CREATE POLICY "Authenticated full access on audit_technologies"
  ON audit_technologies FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on audit_issues" ON audit_issues;
CREATE POLICY "Authenticated full access on audit_issues"
  ON audit_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on audit_opportunities" ON audit_opportunities;
CREATE POLICY "Authenticated full access on audit_opportunities"
  ON audit_opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on audit_opportunity_services" ON audit_opportunity_services;
CREATE POLICY "Authenticated full access on audit_opportunity_services"
  ON audit_opportunity_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on prospects" ON prospects;
CREATE POLICY "Authenticated full access on prospects"
  ON prospects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on prospect_audits" ON prospect_audits;
CREATE POLICY "Authenticated full access on prospect_audits"
  ON prospect_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);

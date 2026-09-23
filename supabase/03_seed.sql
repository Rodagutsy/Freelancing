-- Upwork Radar — Seed data (V1)
-- Run AFTER 01_rls_policies.sql and 02_views.sql.
--
-- 1. Dee's profile (single user).
-- 2. Portfolio projects: add your REAL projects here OR add them later
--    through the /portfolio screen in the dashboard. The can_claim_text /
--    cannot_claim_text split is the AI guardrail contract — be precise.

INSERT INTO profiles (name, headline, services, target_rate_min, target_rate_max, niches)
VALUES (
  'Dee',
  'Business Automation Developer | AI Workflow | n8n | GoHighLevel | APIs',
  ARRAY['Business Automation', 'AI Workflow', 'n8n', 'GoHighLevel', 'API Integration'],
  50,
  100,
  ARRAY['Business Automation', 'AI Workflow', 'SaaS']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Example portfolio project (REPLACE with real evidence before generating
-- proposals — the AI may only use can_claim_text).
--
-- INSERT INTO portfolio_projects (
--   title, description, skills, strength, implementation_status,
--   evidence_links, can_claim_text, cannot_claim_text
-- ) VALUES (
--   'Cleaning Company Booking Workflow',
--   'n8n workflow that turns inbound leads into scheduled jobs.',
--   ARRAY['n8n', 'Automation', 'Calendly', 'GoHighLevel'],
--   'high',
--   'deployed',
--   ARRAY['https://link.to/evidence-1'],
--   'Built a production n8n workflow that automates a cleaning company’s lead-to-booking flow, saving roughly 6 hours a week.',
--   'Cannot claim specific revenue numbers or team size not verified.'
-- );
-- ---------------------------------------------------------------------------
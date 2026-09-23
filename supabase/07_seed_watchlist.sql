-- 07_seed_watchlist.sql — Seed companies for the ATS radar
-- Run AFTER: 06_ats_sources.sql
--
-- ~14 companies spanning all 4 pillars (design / build / automation / growth),
-- split across US and EU. All endpoints are public ATS board APIs.
-- Platform tokens are left NULL — fill them in if you get API access,
-- or leave them blank and the intake workflow will fall back to scraping.

INSERT INTO watched_companies (name, platform, board_token, careers_url, region, active)
VALUES
  -- BUILD — AI-native product companies
  ('Anthropic',        'greenhouse', NULL, 'https://boards.greenhouse.io/anthropic',                   'us', true),
  ('Mistral AI',       'greenhouse', NULL, 'https://boards.greenhouse.io/mistralai',                  'eu', true),
  ('Hugging Face',     'greenhouse', NULL, 'https://boards.greenhouse.io/huggingface',                'eu', true),

  -- DESIGN — Design tools & product companies
  ('Figma',            'greenhouse', NULL, 'https://boards.greenhouse.io/figma',                      'us', true),
  ('Canva',            'lever',      NULL, 'https://jobs.lever.co/canva',                             'eu', true),

  -- AUTOMATION — Workflow / integration platforms
  ('n8n',              'ashby',      NULL, 'https://jobs.ashbyhq.com/n8n',                            'eu', true),
  ('Zapier',           'lever',      NULL, 'https://jobs.lever.co/zapier',                            'us', true),
  ('Make',             'recruitee',  NULL, 'https://www.make.com/careers',                            'eu', true),
  ('Vercel',           'greenhouse', NULL, 'https://boards.greenhouse.io/vercel',                     'us', true),

  -- GROWTH — Marketing tech & performance
  ('HubSpot',          'greenhouse', NULL, 'https://boards.greenhouse.io/hubspot',                    'us', true),
  ('Brevo',            'smartrecruiters', NULL, 'https://career.smartrecruiters.com/Brevo',          'eu', true),
  ('Attio',            'ashby',      NULL, 'https://jobs.ashbyhq.com/attio',                          'eu', true),

  -- MIXED — Broader AI / dev-tool companies
  ('Supabase',         'greenhouse', NULL, 'https://boards.greenhouse.io/supabase',                   'us', true),
  ('Linear',           'greenhouse', NULL, 'https://boards.greenhouse.io/linear',                     'us', true)

ON CONFLICT (careers_url) DO NOTHING;

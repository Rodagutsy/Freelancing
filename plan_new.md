Here's the complete consolidated plan — everything you've decided, in build order:
Plan: Multi-Persona Profiles + Multi-Source Job Radar
Part A — Four Persona Profiles
A1. SQL patch supabase/05_personas.sql
- profiles becomes multi-row: add label, pillar (design/build/automation/growth), is_default, sort_order
- Existing row becomes "Primary" + default; seed 4 empty personas: Product Design · AI Product Builder · Automation & Integrations · Ads & Growth
A2. Backend
- settings.ts: getProfiles() / getDefaultProfile() / upsert-with-id / setDefault / delete
- scoreJob scores against the default persona; job_scores.profile_id records who scored it (column already exists)
A3. UI
- Settings: persona cards (label, pillar badge, headline snippet) — each editable, each with its own Auto-fill from link, set-default, add/delete
- Job detail: "Re-score with persona ▾" action (new job_scores row)
- Proposal panel: persona selector before drafting — defaults to the persona that scored the job; prompt uses that persona's name/headline/bio/services + shared portfolio
- Portfolio stays shared across personas (can_claim_text is per-project)
A4. n8n 02_scoring.json — update its profile lookup to is_default=true
Part B — ATS Radar (US + EU company sites)
B1. SQL patch supabase/06_ats_sources.sql
- watched_companies table (name, platform, board_token, careers_url, region, active) + RLS
- jobs.source CHECK += 'ats_api'; budget_type CHECK += 'salary'; new columns company_name, location, is_remote
B2. Starter watch list — supabase/07_seed_watchlist.sql
~12–15 companies spanning your 4 pillars (AI-native product cos, design tools, automation platforms, martech/growth; US + EU). Every endpoint live-tested by me first; dead ones dropped.
B3. n8n 05_ats_intake.json
Every 6h → fetch active companies' ATS endpoints (Greenhouse/Lever/Ashby/Workable/SmartRecruiters/Personio/Recruitee — all verified public APIs) → normalize + broad 4-pillar keyword any-match filter → upsert ignore-duplicates (only brand-new jobs return) → existing 02 scoring subworkflow.
B4. App
- detectAts() service: paste any careers URL → sniffs ATS + token → verifies live → saves
- Settings: Watched Companies card (list, add-by-URL, activate/deactivate, delete)
- JobCard: source badge ("Greenhouse · Acme") + company/location
- Scoring prompt: generalize wording so salaried roles score cleanly
B5. Docs — n8n README (new workflow, ~6h latency note) + app README
Explicitly out of scope
Direct LinkedIn scraping (per your choice), Google scraping, portfolio-tagging-per-persona (future).
Verification
npm run typecheck / lint / build; JSON-validate both workflow files; live-test every seed endpoint.
Build order: A1→A2→A3→A4, then B1→B2→B4→B3→B5 (scoring changes land before the ATS workflow that calls them).
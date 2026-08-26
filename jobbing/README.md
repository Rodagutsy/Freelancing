# Upwork Radar

A personal opportunity-intelligence dashboard for Upwork + company career boards. Gmail saved-search alerts and ATS board polls flow through n8n into Supabase, get scored by DeepSeek, and surface in a decision-first Next.js dashboard — score, recommendation, matched evidence, and editable proposal drafts. Jobs you spot while browsing can be added manually by pasting their Upwork URL (details auto-fill when possible). Nothing is ever auto-applied.

Pipeline: `Gmail / ATS boards → n8n → Supabase (Postgres) → Next.js dashboard`.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — `src/`
- **Supabase** — Postgres + Row Level Security + Supabase Auth (magic-link email login)
- **n8n** — intake, AI scoring, proposal drafting, email notifications
- **DeepSeek API** — strict-JSON scoring and proposal generation (server-side only)

## Prerequisites

- Node.js ≥ 20
- A Supabase project
- A self-hosted or cloud n8n instance
- A DeepSeek API key
- An Upwork account with a saved search that emails new matches to your Gmail

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000 and sign in with the magic-link email.

### Environment variables

See `.env.example`. Server-only values (`SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`) are used exclusively inside server code and server actions — never in the browser bundle.

## Database setup

Run in the Supabase SQL Editor, in order:

1. `supabase_migrations.sql` (from the workspace root docs) — base tables
2. `supabase/00_extensions.sql` — `skipped_at` / `skip_reason`, unique `jobs.url`
3. `supabase/01_rls_policies.sql` — RLS: `authenticated` full access, `anon` denied
4. `supabase/02_views.sql` — `job_feed` read-model view
5. `supabase/03_seed.sql` — Dee's profile (+ commented portfolio example)
6. `supabase/04_portfolio_links.sql` — portfolio link columns
7. `supabase/05_personas.sql` — multi-persona profiles (label, pillar, is_default)
8. `supabase/06_ats_sources.sql` — `watched_companies` table, ATS columns on `jobs`
9. `supabase/07_seed_watchlist.sql` — seed ~14 companies across 4 pillars

**Auth:** enable Email provider in Supabase → Authentication → Providers (magic-link OTP). RLS policy file must run before first login.

## n8n

Import the four workflows in [`n8n/workflows/`](./n8n/workflows/) and follow [`n8n/README.md`](./n8n/README.md). Summary:

1. Import `01_intake.json`, `02_scoring.json`, `04_daily_digest.json`, `05_ats_intake.json`.
2. Connect Gmail OAuth2 credentials; set env vars `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `RADAR_EMAIL`.
3. Re-select the referenced sub-workflow in the **Run Scoring** nodes (in both `01_intake.json` and `05_ats_intake.json`).
4. Adjust the **Parse Email** regexes to match your alert email layout; tune the digest cron.

Proposals are generated **on demand only** — use the "Generate proposal" button on a job's page (calls DeepSeek server-side). n8n only ingests, scores, and notifies (daily digest + instant ≥ 9.0 alerts); it never drafts or submits proposals automatically.

### ATS Radar

The `05_ats_intake.json` workflow polls ~14 company career boards (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee) every 6 hours. Companies are managed from Settings → Watched Companies. New jobs matching your 4-pillar keywords are auto-imported and scored. Paste any careers URL — the system auto-detects the ATS platform.

## Commands

```bash
npm run dev        # local dev
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Security model

- **RLS**: `anon` role is denied on every table; `authenticated` (signed-in user) has full access. The `job_feed` view is `security_invoker` so RLS still applies through the view.
- **n8n** writes with the service-role key (bypasses RLS by design).
- Every server action and API route validates input with Zod and requires a Supabase session.
- AI output is validated (score ranges, recommendation enum, word count) and treated as untrusted text — never executed.
- Proposal drafts are stored locally; applying remains a fully manual action on Upwork.

## Docs

- `implementation_plan.md` — the master plan (milestones M0–M6)
- `upwork_radar_prd.md` — product requirements
- `upwork_radar_design_guardrails.md` — dark/gold design system, Lato, 4px grid, WCAG 2.2 AA
- `supabase_migrations.sql` — base schema (source of truth, do not edit; patches live in `supabase/`)
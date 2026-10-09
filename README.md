# Upwork Radar

A personal opportunity-intelligence dashboard for Upwork + company career boards + website auditing. Gmail saved-search alerts flow through n8n into Supabase while company ATS boards are polled **in-app** on a Vercel Cron; jobs are scored by DeepSeek (against every persona) and surface in a decision-first Next.js dashboard — score, recommendation, matched evidence, and editable proposal drafts. Jobs you spot while browsing can be added manually by pasting their Upwork URL (details auto-fill when possible). Nothing is ever auto-applied. The Website & Automation Opportunity Auditor analyzes business websites to identify UX, performance, accessibility, SEO, and automation improvement opportunities, then generates personalized outreach pitches.

Pipeline: `Gmail → n8n → Supabase (Postgres) → Next.js dashboard`, with `ATS boards → in-app intake (Vercel Cron) → Supabase → Next.js dashboard`.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — `src/`
- **Supabase** — Postgres + Row Level Security + Supabase Auth (magic-link email login)
- **n8n** — intake, AI scoring, proposal drafting, email notifications, website auditing
- **DeepSeek API** — strict-JSON scoring, proposal generation, and website audit analysis (server-side only)

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
10. `supabase/09_seed_ats_companies.sql` — seed ~9,935 companies from public ATS directory (Greenhouse, Ashby, Lever)
10. `supabase/08_auditor.sql` — website auditor tables (audits, pages, technologies, issues, opportunities, prospects)
11. `supabase/14_outreach.sql` — outbound prospecting tables (email_sequences, outbounds, outbound_messages, suppressed_contacts) + compliance fields on prospects
12. `supabase/15_seed_email_sequences.sql` — seed the default Email 1-5 outreach sequence template
13. `supabase/16_outbound_message_feed.sql` — sending-pipeline read view (`outbound_message_feed`)
14. `supabase/17_multi_user_rls.sql` — per-user RLS isolation (`user_id` columns, owner-scoped policies, per-user unique indexes, `user_id` columns on read views). **Create your first auth user before running**, so the backfill has an owner to assign existing rows to. Safe to re-run.
15. `supabase/18_rate_limits.sql` — server-side rate-limiting table (`rate_limits`). Safe to re-run.
16. `supabase/19_persona_cv.sql` — master CV storage per persona (`master_cv_text`, `master_cv_filename`, `master_cv_uploaded_at`). Safe to re-run.
17. `supabase/20_multi_persona_scores.sql` — one `job_scores` row per `(user_id, job_id, profile_id)`; rebuilds `job_feed` with best-score + `persona_scores` JSONB; adds the `job_persona_scores` view. Safe to re-run.
18. `supabase/21_ats_scrape.sql` — ATS poll bookkeeping (`last_polled_at`, `last_status`, `last_jobs_found`, `last_error`), a due-index, and resets the watchlist to inactive. Safe to re-run.

**Auth:** enable Email provider in Supabase → Authentication → Providers (magic-link OTP). RLS policy file must run before first login.

## n8n

Import the workflows in [`n8n/workflows/`](./n8n/workflows/) and follow [`n8n/README.md`](./n8n/README.md). Summary:

1. Import `01_intake.json`, `02_scoring.json`, `04_daily_digest.json`, `10_audit_pipeline.json`, `11_audit_pitch.json`. (ATS intake now runs in-app — see [ATS Radar](#ats-radar) — so `05_ats_intake.json` is deprecated and should be left disabled.)
2. Connect Gmail OAuth2 credentials; set env vars `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `RADAR_EMAIL`.
3. Re-select the referenced sub-workflow in the **Run Scoring** node of `01_intake.json`.
4. Adjust the **Parse Email** regexes to match your alert email layout; tune the digest cron.

Proposals are generated **on demand only** — use the "Generate proposal" button on a job's page (calls DeepSeek server-side). n8n only ingests, scores, and notifies (daily digest + instant ≥ 9.0 alerts); it never drafts or submits proposals automatically.

### ATS Radar

ATS polling now runs **in-app** — no n8n required. A Vercel Cron (`vercel.json`, every 30 minutes) calls `GET /api/intake/run` with `Authorization: Bearer $CRON_SECRET`; the same route can be triggered manually with the **Run intake** button in Settings → Watched Companies. It polls every **active** company on Greenhouse, Lever, Ashby, Workable, SmartRecruiters, or Recruitee (Personio is not supported), matches postings against your `ATS_KEYWORDS`, imports new jobs (dedup on `(user_id, url)`), and scores them for every persona.

The ~9,935 seeded companies (Greenhouse/Ashby/Lever directory) form a searchable **catalog** that starts **inactive** — only companies you activate are polled. Search the catalog and toggle companies on/off from Settings → Watched Companies; each row shows its last poll time, status, and jobs found.

### Website Auditor

The `10_audit_pipeline.json` workflow performs website audits: page discovery via sitemap, fetch-based crawling with technology fingerprinting, AI-powered issue analysis, and opportunity detection. The `11_audit_pitch.json` workflow generates personalized outreach pitches on demand. Both are triggered via webhook from the Next.js dashboard.

### Outreach (human-in-the-loop drafting)

Prospects can hold one active outbound campaign built from the audit evidence. "Draft outreach" on a prospect page generates an Email 1-5 sequence (AI, grounded in the primary/completed audit's top opportunities; falls back to the default seed template). Drafts land in the `pitch_drafted` state and are managed on the **Outreach** pages (`/outbounds`): review the sequence, edit steps inline, regenerate with a plain-English instruction, approve, or reject with a note. Nothing is actually emailed yet — sending moves through `outbound_messages` when the Phase C pipeline is connected.

Notable rules: one active campaign per prospect (partial unique index); drafting is blocked for suppressed emails (`suppressed_contacts`), and every prospect records `contact_type` + `reason_for_contact` for compliance.

### Sending pipeline (Phase C)

"Send now" on an approved campaign queues email 1 (`outbound_messages.status = queued`, campaign → `sending`) and fires `N8N_OUTBOUND_WEBHOOK_URL` (falls back to `N8N_AUDIT_WEBHOOK_URL`) with the message + recipient, matching the audit trigger pattern. n8n does the actual SMTP send with Gmail OAuth, then:

- reports results back to `POST /api/outbounds/report` (Bearer `N8N_WEBHOOK_SECRET` or a signed-in session) with `{ messageId, status: "sent" | "failed", provider?, providerMessageId?, error? }`, or
- writes `outbound_send` / `outbound_message_feed` rows directly using the service-role key.

Each successful send advances `current_step`; the campaign moves `sending → sent`. Without n8n, the "Mark as sent" control on the campaign page simulates a delivery (provider `manual`), so the state machine is testable end-to-end. An n8n polling workflow can pull queued messages from the `outbound_message_feed` view via the service-role key, and report outcomes to `POST /api/outbounds/report`.

### Reply & open tracking (Phase D)

Inbound signals are ingested by `POST /api/outbounds/track` (Bearer `N8N_WEBHOOK_SECRET` or a signed-in session) as a discriminated payload:

- `{ event: "opened", messageId }` — marks the message `opened` (idempotent; rejects drafts/queued).
- `{ event: "reply", outboundId, from, subject?, body, receivedAt? }` — appends the reply to `outbounds.replies`, sets `replied_at`, and flips the campaign to `replied`.

Each reply is auto-classified (DeepSeek) into `interested | question | not_interested | wrong_person | unsubscribe`; the reason and a suggested reply are stored with it. An `unsubscribe` classification also records a `suppressed_contacts` row (reason `replied_stop`) and sets `subscribed = false`, so auto-suppression works even if webhook ingestion partially fails. The campaign page shows the classification badge, the reply thread, each reply's rationale, and a suggested response; the "Log a reply" form lets you enter replies manually when n8n isn't connected.

### Follow-up automation (Phase E)

Campaign status follows the sequence automatically: after email 1 is sent (`markMessageSent` via the report callback or the "Mark as sent" control) the campaign is `sent`; email 2 → `follow_up_1`; emails 3+ → `follow_up_2`; the final email → `done`. `current_step` tracks how many emails have gone out, so an in-progress campaign knows exactly which step is next.

The **Send follow-up** control on a campaign page queues the next step (reusing the same `queueOutboundStep` path as the initial send, with `follow_up: true`) from any of `sent | replied | follow_up_1 | follow_up_2`, fires `N8N_OUTBOUND_WEBHOOK_URL` with `follow_up: true` in the payload, and reports back through the same `/api/outbounds/report` endpoint. The page shows the next step's due date (`sent_at` of the last email + the step's `day_offset`), so a scheduler can later trigger sends automatically. The outreach feed (`/outbounds`) gains a status filter so you can pull up just the campaigns awaiting a follow-up. No SQL migration was needed: everything rides on the existing `steps`/`current_step`/`status` columns.

### Compliance hard-stop & dashboard (Phase F)

- **Enforcement**: `queueOutboundStep` runs `assertContactable` again before *any* send — initial or follow-up — so a prospect suppressed after approval (unsubscribe, manual block, bounce, legal hold) can never be queued; `createOutbound` already enforced this at draft time. An inbound reply classified as `unsubscribe` now also flips its campaign to `do_not_contact` in addition to writing the suppression row.
- **Blocklist hub**: `/outbounds/suppressed` (also in the sidebar as **Blocklist**) shows every suppressed contact with reason, note, and source campaign, lets you add a manual block or remove one (with confirmation), and paginates. Removal is immediate — the next draft/send attempt passes the guard again.
- **Dashboard**: an Outreach overview section shows in-progress campaigns, awaiting follow-up, replies, reply rate (replied ÷ campaigns with ≥1 email sent), blocked contacts, and completed campaigns.
- Nav active-state now resolves the longest matching prefix, so `/outbounds/suppressed` highlights **Blocklist** rather than **Outreach**.

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
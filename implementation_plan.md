# Upwork Radar V1 — Implementation Plan

A personal opportunity intelligence system: Gmail → n8n → Supabase → Next.js dashboard.

---

## Open Questions

> [!IMPORTANT]
> **Resolve before starting M4 (Dashboard):**
> 1. **Auth method:** Simple magic-link email (Supabase Auth) or Vercel password protection for single-user V1?
> 2. **Hosting:** Deploy Next.js on Vercel? Self-hosted? (affects env var strategy)
> 3. **n8n hosting:** Already self-hosted locally, or cloud instance (n8n.cloud)?
> 4. **DeepSeek key:** Available and ready to use?
> 5. **Gmail OAuth:** Will you use a Google Cloud project (OAuth2) or a service account for n8n Gmail integration?
> 6. **Domain / subdomain:** Any custom domain for the dashboard, or Vercel's default `.vercel.app`?

---

## Architecture Summary

```
Upwork Saved-Search Email → Gmail
        ↓
   n8n Workflow
   ├─ Parse email (regex/HTML)
   ├─ Score via DeepSeek API
   ├─ Draft proposal via DeepSeek API
   └─ Write to Supabase (Postgres)
        ↓
   Next.js App (TypeScript, App Router)
   ├─ /dashboard  ← decision-first overview
   ├─ /jobs       ← filterable queue
   ├─ /jobs/[id]  ← job decision workspace
   ├─ /applications ← outcome tracker
   ├─ /portfolio  ← evidence management
   └─ /settings   ← profile & integrations
        ↓
   Gmail notifications (daily digest + instant ≥9.0)
```

---

## Phase 0 — Project Bootstrap

**Goal:** Scaffold repo, set up tooling, connect Supabase.

### Steps
1. **Create Next.js project**
   ```bash
   npx create-next-app@latest upwork-radar --typescript --app --eslint --no-tailwind --src-dir
   ```
2. **Install core dependencies**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr zod lucide-react
   npm install -D @types/node prettier
   ```
3. **Configure design tokens** — create `src/styles/tokens.css` with all CSS variables from the design guardrails (colors, spacing, radii, typography scale).
4. **Set up Lato font** — add `next/font/google` Lato import in `src/app/layout.tsx`.
5. **Configure TypeScript strict mode** in `tsconfig.json`.
6. **Set up `.env.local`** with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `DEEPSEEK_API_KEY` (server-only)
7. **Add `.env*.local` to `.gitignore`**.
8. **Run `npm run build`** — confirm zero errors before any feature work.

---

## Phase 1 (M1) — Database & Intake

**Goal:** Supabase schema live, n8n reads Gmail and writes structured job records.

### Steps
1. **Run Supabase migrations** (`supabase_migrations.sql`) in the Supabase SQL Editor:
   - Creates: `profiles`, `portfolio_projects`, `jobs`, `job_scores`, `proposals`, `applications`, `manual_review_queue`
   - Verify all indexes and CHECK constraints exist.
2. **Enable Row Level Security (RLS)** on every table. Add a policy: `authenticated` role has full access; anon has none.
3. **Seed initial profile row** — insert Dee's profile (name, headline, services, niches, rate targets) into `profiles`.
4. **Seed portfolio projects** — insert each portfolio project with `can_claim_text` and `cannot_claim_text` properly separated.
5. **Build n8n workflow — Gmail Trigger:**
   - Trigger: Gmail node, filter on sender `@upwork.com` + subject contains `"Upwork"`.
   - Extract raw email body (HTML/text).
6. **Build n8n workflow — Parser node:**
   - Use a Code/Function node (JavaScript) with regex/HTML parsing to extract:
     - `title`, `description`, `skills_requested[]`, `budget_min/max`, `budget_type`
     - `client_rating`, `client_reviews_count`, `client_jobs_posted`, `client_hire_rate`
     - `proposals_count`, `posted_at`, `url`
   - Validation: if critical fields (`title`, `url`, `description`) are missing → route to manual review queue.
7. **Write to Supabase — jobs table:**
   - Use Supabase node (or HTTP Request node) to `INSERT` into `jobs` with `source = "upwork_email"`.
   - On parse failure → insert into `manual_review_queue` with `raw_email` and `error_reason`.
8. **Test M1:**
   - Trigger a real Upwork saved-search alert email.
   - Confirm structured row appears in `jobs` table within 5 minutes.

---

## Phase 2 (M2) — Scoring Engine

**Goal:** Every new job gets an AI score (0–10), explanation, and recommendation stored in `job_scores`.

### Steps
1. **Fetch context for scoring** in n8n (after M1 job insert):
   - Load `profiles` row (Dee's profile).
   - Load all `portfolio_projects` rows.
2. **Build DeepSeek scoring prompt:**
   - System: scoring rubric (weights from PRD §8.1), instruction to return strict JSON.
   - User: job fields + profile + portfolio skills.
   - Required JSON output: `{ score_total, confidence, recommendation, explanation, factors }`.
3. **Call DeepSeek API** via n8n HTTP Request node (POST to `https://api.deepseek.com/chat/completions`).
4. **Parse and validate response:**
   - Validate `score_total` is 0–10, `confidence` is 0–1, `recommendation` in `[APPLY, REVIEW, SKIP]`.
   - On validation failure → log error and flag job for manual review.
5. **Map recommendation bands:**
   - 9.0–10.0 → `APPLY` (high priority)
   - 8.0–8.9 → `APPLY` (strong)
   - 7.0–7.9 → `REVIEW`
   - 6.0–6.9 → `REVIEW` (usually skip)
   - 0–5.9 → `SKIP`
6. **Write to `job_scores`** — insert the scored record linked to `job_id` and `profile_id`.
7. **Test M2:**
   - End-to-end: Gmail → parse → score.
   - Verify `job_scores` row present with correct fields.
   - Check a few explanations for quality.

---

## Phase 3 (M3) — Proposal Generator

**Goal:** For jobs scoring ≥ 7, generate a tailored proposal draft and store in `proposals`.

### Steps
1. **Add conditional branch in n8n:** `IF score_total >= 7 → generate proposal`.
2. **Select matched portfolio projects:**
   - Filter `portfolio_projects` where skills overlap with `skills_requested`.
   - Rank by `strength` (high > medium > low).
   - Pass top 2–3 projects to the prompt.
3. **Build DeepSeek proposal prompt:**
   - System: guardrails — use only `can_claim_text`, never invent experience, 150–250 words, specific job bottleneck focus.
   - Include `cannot_claim_text` as a hard negative constraint.
   - Include evidence links for proof lines.
   - Required JSON output: `{ draft_text, angle, used_projects[] }`.
4. **Call DeepSeek API** (proposal generation).
5. **Parse and validate response:**
   - Validate word count is 150–250.
   - Sanitize `draft_text` (treat as untrusted text; no HTML/code execution).
   - `used_projects` must be valid UUIDs from `portfolio_projects`.
6. **Write to `proposals`** — insert with `job_id`, `version = 1`.
7. **Test M3:**
   - Confirm proposal appears in DB for a ≥7 scored job.
   - Manually read 3 proposals and verify no fabricated claims.

---

## Phase 4 (M4) — Next.js Dashboard

**Goal:** Full UI for reviewing, copying proposals, and tracking applications.

### 4.1 Foundation & Design System

1. **CSS design tokens** (`src/styles/tokens.css`):
   - All color tokens, spacing scale (4px grid), typography tokens, radii.
   - Import in `src/app/globals.css`.
2. **Lato font setup** in `src/app/layout.tsx` via `next/font/google`.
3. **Supabase client utilities:**
   - `src/lib/supabase/server.ts` — server-side client (service role for server actions).
   - `src/lib/supabase/client.ts` — browser client (anon key).
4. **Zod schemas** (`src/lib/schemas/`) for all DB types.
5. **Auth setup** — Supabase Auth magic link (or chosen method). Middleware to protect all routes.

### 4.2 Component Library

Build all required components (no duplicated markup):

| Component | Location |
|---|---|
| `AppShell` | `src/components/layout/AppShell.tsx` |
| `SidebarNav` | `src/components/layout/SidebarNav.tsx` |
| `MobileNavDrawer` | `src/components/layout/MobileNavDrawer.tsx` |
| `PageHeader` | `src/components/layout/PageHeader.tsx` |
| `JobCard` | `src/components/jobs/JobCard.tsx` |
| `JobScore` | `src/components/jobs/JobScore.tsx` |
| `RecommendationBadge` | `src/components/jobs/RecommendationBadge.tsx` |
| `ConfidenceIndicator` | `src/components/jobs/ConfidenceIndicator.tsx` |
| `MetadataRow` | `src/components/jobs/MetadataRow.tsx` |
| `SkillTag` | `src/components/common/SkillTag.tsx` |
| `FilterBar` | `src/components/jobs/FilterBar.tsx` |
| `FilterSheet` | `src/components/jobs/FilterSheet.tsx` |
| `ScoreBreakdown` | `src/components/jobs/ScoreBreakdown.tsx` |
| `EvidenceCard` | `src/components/jobs/EvidenceCard.tsx` |
| `ProposalEditor` | `src/components/proposals/ProposalEditor.tsx` |
| `ApplicationStatusSelect` | `src/components/applications/ApplicationStatusSelect.tsx` |
| `EmptyState` | `src/components/common/EmptyState.tsx` |
| `ErrorState` | `src/components/common/ErrorState.tsx` |
| `LoadingSkeleton` | `src/components/common/LoadingSkeleton.tsx` |
| `Toast` | `src/components/common/Toast.tsx` |
| `ConfirmDialog` | `src/components/common/ConfirmDialog.tsx` |
| `FormField` | `src/components/common/FormField.tsx` |
| `Button` | `src/components/common/Button.tsx` |

Each component must implement all required states: Default, Hover, Focus-visible, Active, Disabled, Loading, Error, Empty, Success.

### 4.3 Pages

#### `/dashboard` (Server Component)
- Greeting: `Good [morning/afternoon/evening], Dee` + current date.
- Priority strip: counts of `APPLY`, `REVIEW`, `SKIP` today.
- `Apply now` job list (score ≥ 9), sorted score DESC → posted_at ASC.
- `Needs review` job list (score 7–8.9).
- Metrics row: Jobs analyzed, High-fit, Proposals drafted, Applications logged.
- Empty state: if no jobs yet, explain and link to settings.

#### `/jobs` (Server Component + Client filters)
- Default filter: score 7–10, posted within 24h.
- Default sort: score DESC, newest.
- Filter bar: Score, Posted, Budget, Client rating, Skills, Status.
- Server-side cursor pagination.
- Empty state with `Clear filters` action.

#### `/jobs/[id]` (Server Component + Client interactions)
- 12-column layout: 8-col main, 4-col sticky decision panel.
- Sections in exact order (per design guardrails §7.2):
  1. Job header
  2. Decision panel (score 36px gold, recommendation badge, confidence, actions)
  3. Score breakdown with factor bars
  4. Job description + skills
  5. Matched evidence (portfolio projects)
  6. Proposal editor (editable textarea, char count, copy, regenerate with reason chips)
  7. Application status
  8. Notes
- Server action: `regenerateProposal(jobId, instruction)` — calls DeepSeek, inserts new `proposals` version.
- Server action: `updateApplicationStatus(jobId, outcome)`.

#### `/applications` (Server Component)
- Table/list of applications with: job title, score at apply, outcome badge, applied date, notes.
- Mobile: stacked key-value rows (no sideways scroll).
- Outcome update via `ApplicationStatusSelect`.

#### `/portfolio` (Server + Client)
- List of portfolio projects (title, strength, skills, implementation status).
- CRUD: Add / Edit / Delete with `ConfirmDialog` for destructive delete.
- Form fields: title, description, skills, strength, implementation_status, evidence_links, can_claim_text, cannot_claim_text.
- Zod validation on both client and server.

#### `/settings` (Server + Client)
- Profile section: name, headline, services, niches, rate targets — save via server action.
- Intake section: (informational) Gmail saved-search setup guide.
- Integrations: (display only in V1) show connection status for Gmail/n8n/DeepSeek.

### 4.4 API Routes (Server Actions / Route Handlers)

| Route | Method | Purpose |
|---|---|---|
| `src/app/api/jobs/route.ts` | GET | Paginated job list with filters |
| `src/app/api/jobs/[id]/route.ts` | GET | Single job with score + proposal |
| `src/app/api/jobs/[id]/proposal/route.ts` | POST | Regenerate proposal (calls DeepSeek) |
| `src/app/api/applications/route.ts` | GET/POST | List and create applications |
| `src/app/api/applications/[id]/route.ts` | PATCH | Update outcome/notes |
| `src/app/api/portfolio/route.ts` | GET/POST | List and create portfolio items |
| `src/app/api/portfolio/[id]/route.ts` | PATCH/DELETE | Edit and delete portfolio items |
| `src/app/api/settings/route.ts` | GET/PATCH | Profile read/update |

All routes: authenticate via Supabase session, validate input with Zod, return typed responses.

---

## Phase 5 (M5) — Notifications

**Goal:** Daily digest email and optional instant alert for ≥ 9.0 jobs.

### Steps
1. **Daily digest (n8n scheduled workflow):**
   - Trigger: cron, daily at chosen time (e.g., 8:00 AM).
   - Query Supabase for jobs with `score_total >= 7` ingested in the last 24h.
   - Format HTML email: job title, score, recommendation, budget, one-line summary, dashboard link.
   - Send via Gmail node.
2. **Instant alert (n8n — add to M2 workflow):**
   - After scoring: `IF score_total >= 9.0 → send Gmail alert immediately`.
   - Email: job title, score, `Apply now` dashboard link.
   - Rate limit: only send if not already alerted for this job (check `job_scores` for existing record).

---

## Phase 6 (M6) — Application Tracker & Learning Loop

**Goal:** Log and track applied jobs, record outcomes, surface analytics.

### Steps
1. **Applications page** (built in M4) — confirm all CRUD works end-to-end.
2. **Outcome logging:** When user marks `Applied`, create `applications` row with `score_at_apply`.
3. **Outcome update:** `ApplicationStatusSelect` allows updating to `viewed`, `interview`, `hired`, `rejected`.
4. **Analytics section** (add to `/dashboard` or `/applications`):
   - Interview rate by score band (0–5.9, 6–6.9, 7–7.9, 8–8.9, 9–10).
   - Interview rate by budget range.
   - Most successful proposal angles.
   - Display as simple stat rows or bar charts (use a lightweight chart lib like `recharts` or plain CSS bars).

---

## Security Checklist (Run After Every Phase)

Before merging or deploying any phase:

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — successful
- [ ] `npm audit --omit=dev` — no high/critical vulnerabilities
- [ ] No secrets in client bundles, logs, or error messages
- [ ] `.env*.local` excluded from git
- [ ] Supabase RLS enabled; anon role denied by default
- [ ] All API routes authenticate + authorize every request
- [ ] Input validation (Zod) on every server endpoint
- [ ] AI output sanitized before rendering
- [ ] Lighthouse + axe accessibility audit — no critical/serious failures
- [ ] Tested at: 320px, 375px, 390px, 768px, 1024px, 1280px, 1440px widths
- [ ] No prohibited Upwork automation (no scraping, no auto-submit)

---

## Milestone Summary

| # | Milestone | Deliverable |
|---|---|---|
| M0 | Bootstrap | Scaffolded Next.js repo, design tokens, Supabase connected |
| M1 | Intake | Gmail → n8n parser → `jobs` table (within 5 min of alert) |
| M2 | Scoring | DeepSeek score + explanation → `job_scores` |
| M3 | Proposals | DeepSeek proposal drafts for ≥7 jobs → `proposals` |
| M4 | Dashboard | Full Next.js UI: all pages, filters, actions, responsive |
| M5 | Notifications | Daily digest + instant ≥9.0 Gmail alert |
| M6 | Tracker | Applications log, outcomes, learning loop analytics |

---

## Definition of Done (Per Feature)

A screen or feature is complete only when:
- Follows all design tokens, component rules, and 4px spacing grid
- Has desktop, tablet, and mobile layouts
- Has loading, empty, error, success, disabled, hover, active, and keyboard-focus states
- Passes WCAG 2.2 AA
- Uses Lato font and dark black/white/gold color system
- No shadows anywhere
- One clear primary action per screen
- Passes security checklist above
- No prohibited Upwork automation added

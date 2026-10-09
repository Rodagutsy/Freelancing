# Self-Sufficient App — Implementation Plan
> Removes all hard n8n runtime dependencies for the five core features.\
> Gmail intake stays on hold. All AI work goes through the existing DeepSeek client.

> **Status (done):** Phases 0–6 shipped. In addition, per-persona master CV upload + autofill (`19_persona_cv.sql`), multi-persona scoring with persona badges/filter (`20_multi_persona_scores.sql`), and an **in-app ATS intake** replacing the n8n `05_ats_intake.json` workflow (`21_ats_scrape.sql`, `src/lib/services/atsIntake.ts`, `/api/intake/run`, Vercel Cron via `vercel.json`, manual "Run intake" in Settings). A job-detail **Application kit** now generates a tailored CV and cover letter on demand. See `README.md` for the current architecture. The SQL snippets below are historical; migrations are the source of truth.

---

## Current State Audit

| Feature | Status | n8n Dependency? |
|---|---|---|
| **Job posting (manual)** | ✅ UI + server action exist (`addJob`, `fetchJobFromUrl`) | None — already self-sufficient |
| **Job scoring** | ✅ `scoreJob` service + `addJob` auto-scores | None — already self-sufficient |
| **Proposal (cover letter)** | ✅ `generateProposal` service + editor on `/jobs/[id]` | None — already self-sufficient |
| **Resume parsing** | ❌ Not implemented anywhere | — |
| **Application question answering** | ❌ Not implemented anywhere | — |
| **Audit pipeline** | ⚠️ `postWebhook` to n8n at line 827 & API route | Hard n8n call |
| **Outbound send** | ⚠️ `postWebhook` to n8n at lines 1215 & 1260 | Hard n8n call |

> **Key finding:** The five features you need are either already done or missing entirely (resume parsing, QA). The broken n8n calls are in *audits* and *outbounds* — unrelated to the jobs workflow. The jobs/scoring/proposals pipeline is already fully self-sufficient.

---

## Phase 0 — Unblock Vercel Deployment (1–2 hours)

**Problem:** The `N8N_AUDIT_WEBHOOK_URL` and `N8N_OUTBOUND_WEBHOOK_URL` env vars point to `localhost:5678` which doesn't exist on Vercel. When those server actions run, they throw and crash. The build itself is fine, but runtime errors will surface on those flows.

### Tasks

1. **Remove n8n env vars from Vercel** (Vercel dashboard → Settings → Environment Variables):
   - Delete `N8N_AUDIT_WEBHOOK_URL`
   - Delete `N8N_OUTBOUND_WEBHOOK_URL`
   - Keep `N8N_WEBHOOK_SECRET` (or also remove it — code handles missing URLs gracefully)

2. **Verify graceful fallback in `webhook.ts`** — already handles missing URL:
   ```ts
   // webhook.ts line 44 — returns false when no URL, never throws
   if (!config.url) return false;
   ```
   The audit and outbound actions already check the boolean return, so no code change needed for the webhook path.

3. **Confirm `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` are set in Vercel** — these are required for scoring and proposals to work in production.

4. **Run `npm run build` locally** — confirm zero TypeScript errors before pushing.

**Definition of done:** App loads on Vercel, `/jobs`, `/jobs/[id]`, `/dashboard`, `/portfolio`, `/settings` all render without 500 errors.

---

## Phase 1 — Confirm Existing Job Posting + Scoring Flow (0.5 hours)

Everything needed is already built. This phase is validation only.

### What already works
- **Add Job button** on `/jobs` → `AddJobModal` → `fetchJobFromUrl` (pre-fills from Upwork URL) → `addJob` server action
- `addJob` inserts into `jobs` table then immediately calls `scoreJob` (DeepSeek)
- Score is stored in `job_scores`, visible in `job_feed` view on `/jobs/[id]`
- Proposal editor on `/jobs/[id]` calls `generateProposalAction` → DeepSeek

### Tasks (verification only)
1. Add a real Upwork job URL through the UI, confirm it gets scored.
2. Open the job detail page, confirm score breakdown renders.
3. Click "Generate proposal", confirm draft appears in editor.
4. Confirm "Copy" and "Regenerate" (with instruction chip) work.

**Definition of done:** End-to-end job → score → proposal works without any n8n involvement.

---

## Phase 2 — Resume Parsing (1 day)

Allows Dee to upload a resume (PDF or plain text) and have it auto-populate her profile fields via DeepSeek extraction.

### New files to create

| File | Purpose |
|---|---|
| `src/lib/services/resumeParser.ts` | Extract structured profile data from resume text |
| `src/lib/schemas/resume.ts` | Zod schema for resume AI output |
| `src/app/api/resume/route.ts` | API route to receive file upload, return extraction |
| `src/app/(app)/settings/ResumeUpload.tsx` | Client component: drag-drop file, show extraction preview, one-click apply |

### Implementation details

**`src/lib/schemas/resume.ts`**
```ts
import { z } from "zod";
export const resumeExtractSchema = z.object({
  name: z.string().optional(),
  headline: z.string().optional(),
  bio: z.string().optional(),
  services: z.array(z.string()).optional(),
  niches: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),        // for portfolio hint
  target_rate_min: z.number().optional(),
  target_rate_max: z.number().optional(),
});
export type ResumeExtract = z.infer<typeof resumeExtractSchema>;
```

**`src/lib/services/resumeParser.ts`**
- Accepts raw text (caller strips PDF binary before sending)
- Calls `chatJson<unknown>` with a system prompt: *"Extract structured freelancer profile data from the resume below. Return JSON matching the schema. Return only fields you are confident about; omit uncertain ones."*
- Validates output with `resumeExtractSchema`

**`src/app/api/resume/route.ts`** (POST, multipart/form-data)
- Auth: `requireUser()` (reject unauthenticated)
- Accept `file` field (PDF or `.txt`)
- For PDF: use `pdf-parse` npm package to extract text (server-side only)
- For text: read directly
- Call `parseResume(text)` → return JSON
- Hard limits: max 2 MB file, text truncated at 12,000 chars before AI call
- Rate-limited: use existing `checkRateLimit` with a new `resume` rule (3 uploads per hour)

**`ResumeUpload.tsx`** (client component in `/settings`)
- Drag-drop or click to upload area
- Shows spinner during extraction
- Renders a diff-style preview: "We found these fields — click Apply to fill your profile"
- On "Apply": calls `saveProfile` server action with the extracted fields
- Does NOT auto-save — user must confirm

### DB changes
- None. All data lands in existing `profiles` table via the existing `saveProfile` action.

### Dependency to add
```bash
npm install pdf-parse
npm install -D @types/pdf-parse
```

---

## Phase 3 — Application Question Answering (1.5 days)

When applying to a job on Upwork, clients often ask 1–3 screening questions. This feature lets Dee paste questions and get AI-drafted answers, grounded in her portfolio and profile.

### New files to create

| File | Purpose |
|---|---|
| `src/lib/services/questionAnswering.ts` | AI service: given questions + job context → generate answers |
| `src/lib/schemas/questionAnswering.ts` | Zod schema for QA input and AI output |
| `src/app/actions.ts` (additions) | `answerApplicationQuestionsAction` server action |
| `src/components/jobs/ApplicationQA.tsx` | Client component: question input, answer display, copy buttons |
| (modify) `src/app/(app)/jobs/[id]/page.tsx` | Add `<ApplicationQA>` section below proposal editor |

### Implementation details

**`src/lib/schemas/questionAnswering.ts`**
```ts
import { z } from "zod";
export const applicationQAInputSchema = z.object({
  jobId: z.string().uuid(),
  questions: z.array(z.string().trim().min(3).max(500)).min(1).max(5),
});
export const applicationQAOutputSchema = z.object({
  answers: z.array(z.object({
    question: z.string(),
    answer: z.string().min(1).max(1000),
  })),
});
```

**`src/lib/services/questionAnswering.ts`**
- Loads job row, profile row, portfolio projects (same pattern as `scoring.ts`)
- Builds prompt: *"You are answering Upwork application screening questions on behalf of a freelancer. Use ONLY the portfolio can_claim_text for evidence. Answer each question concisely (50–150 words). Return JSON: { answers: [{question, answer}] }"*
- Calls `chatJson`, validates with `applicationQAOutputSchema`

**Server action** `answerApplicationQuestionsAction` in `actions.ts`:
- Auth guard, Zod validation, AI rate limit (use `aiRateRules` — add `qa` key with same limits as `proposal`)
- Calls service, returns `ActionResult<{ answers: Array<{question, answer}> }>`

**`ApplicationQA.tsx`** (client component)
- Textarea to paste each question (dynamic add/remove, up to 5)
- "Get answers" button → calls server action
- Shows each answer in a read-only card with a "Copy" button
- Loading, error, and empty states

**Job detail page update:**
- Add `<ApplicationQA jobId={feed.id} />` as a new section after the `<ProposalEditor>`, before `<NotesEditor>`

### DB changes
- No new table. Answers are ephemeral — not persisted (can be regenerated on demand).
- Optional future enhancement: persist in a `job_qa` table. Not in scope now.

---

## Phase 4 — Cover Letter Generation (0.5 days)

> **Note:** The existing `generateProposal` service already produces what Upwork calls a "cover letter" — it's the proposal/pitch text. If you want a *separate* cover letter specifically formatted for non-Upwork job applications (from the `/outbounds` or ATS flow), that's a distinct feature. Clarify below.

### Option A — Upwork proposals (already done)
If "cover letter" = Upwork proposal, **this is already implemented**. The `ProposalEditor` on `/jobs/[id]` is exactly this. Nothing to build.

### Option B — Standalone cover letter for off-platform jobs
If you need a generic cover letter (not tied to an Upwork job URL), here's the plan:

| File | Purpose |
|---|---|
| `src/lib/services/coverLetter.ts` | New AI service — uses profile + portfolio, no job DB row required |
| `src/lib/schemas/coverLetter.ts` | Input (job title, description, company) + output (letter_text) schemas |
| `src/app/actions.ts` (additions) | `generateCoverLetterAction` server action |
| `src/app/(app)/outbounds/CoverLetterModal.tsx` | Modal: paste job description → generate letter → copy |

> [!IMPORTANT]
> Confirm which option you need before implementing Phase 4. If it's Option A, skip this phase entirely — it's done.

---

## Phase 5 — Job Matching Improvements (0.5 days)

The current matching in `matchPortfolioProjects` uses exact skill string overlap. This is functional but misses synonyms (e.g. "n8n" vs "workflow automation").

### Tasks

1. **Add semantic keyword expansion** in `prompts.ts` — include skill aliases in the scoring prompt so DeepSeek can account for partial overlaps.
2. **Add a "match score" display** on `EvidenceCard` showing how many skills overlapped.
3. **Ensure `job_feed` view exists in Supabase** — the code queries `job_feed` which must be a Postgres view joining `jobs` + latest `job_scores` + latest `proposals`. If missing in the deployed DB, create it:

```sql
CREATE OR REPLACE VIEW job_feed AS
SELECT
  j.*,
  js.id          AS score_id,
  js.score_total,
  js.confidence,
  js.recommendation,
  js.explanation,
  js.factors,
  js.created_at  AS score_created_at,
  js.profile_id  AS score_profile_id,
  p.id           AS proposal_id,
  p.draft_text   AS proposal_draft_text,
  p.angle        AS proposal_angle,
  p.used_projects AS proposal_used_projects,
  p.version      AS proposal_version
FROM jobs j
LEFT JOIN LATERAL (
  SELECT * FROM job_scores WHERE job_id = j.id ORDER BY created_at DESC LIMIT 1
) js ON true
LEFT JOIN LATERAL (
  SELECT * FROM proposals WHERE job_id = j.id ORDER BY version DESC LIMIT 1
) p ON true;
```

> [!IMPORTANT]
> Run this SQL in the Supabase SQL Editor immediately — the jobs list and job detail pages will return empty or 500 errors without this view.

---

## Phase 6 — Final Vercel Wiring (1–2 hours)

### Environment variables to set in Vercel
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Already set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Already set |
| `DEEPSEEK_API_KEY` | *your key from platform.deepseek.com* |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | `deepseek-chat` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |
| `N8N_AUDIT_WEBHOOK_URL` | **Remove or leave blank** |
| `N8N_OUTBOUND_WEBHOOK_URL` | **Remove or leave blank** |

### RLS check
Confirm Row Level Security is enabled in Supabase with an authenticated-only policy on:
- `jobs`, `job_scores`, `proposals`, `applications`, `profiles`, `portfolio_projects`

---

## Build Order (Recommended)

```
Phase 0  →  Phase 5 (DB view)  →  Phase 1 (validation)
                                       ↓
                              Phase 2 (Resume)
                                       ↓
                              Phase 3 (QA)
                                       ↓
                  Phase 4 (Cover letter — confirm need first)
                                       ↓
                              Phase 6 (Vercel wiring)
```

---

## Summary Table

| Phase | Feature | Work | ETA |
|---|---|---|---|
| 0 | Remove n8n from Vercel, confirm env vars | Config only | 1–2 hrs |
| 1 | Validate existing job/score/proposal flow | Testing only | 30 min |
| 2 | Resume parsing (PDF/text → profile) | New API route + UI | 1 day |
| 3 | Application question answering | New service + action + UI | 1.5 days |
| 4 | Cover letter (clarify need first) | New service + action + UI | 0.5 days |
| 5 | DB view + matching display | SQL + minor UI | 0.5 days |
| 6 | Vercel env + RLS check | Config only | 1–2 hrs |

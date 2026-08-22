# Upwork Radar — Personal Opportunity Intelligence System (V1)

## 1. Product Overview
**Vision:** A personal automation system that discovers new Upwork jobs, qualifies them against your profile, scores fit (0–10), drafts tailored proposals, and routes high-fit opportunities to you for manual review and submission.  
**Goal:** Maximize interview rate while protecting Connects by avoiding low-fit applications and staying compliant with Upwork's Terms of Use. [web:1][web:2]  
**Scope (V1):** Job discovery via supported channels → qualification → scoring → proposal drafting → human approval. No auto-submission. [web:1][web:2]

## 2. Constraints & Compliance
- **Upwork ToU:** Do not use browser automation, scrapers, auto-refreshers, RPA/page monitors, or similar tools that interact with Upwork without permission. Use approved API access where eligible. [web:1][web:2]  
- **Intake Strategy (V1):** Use Upwork saved-search email alerts (Gmail) as the primary job-intake channel. Optionally add official API later if eligible. [web:1][web:2]  
- **Submission:** Proposals are drafted by the system but submitted manually by you.

## 3. Target User & Use Cases
- **Primary User:** Dee (Business Automation Developer | AI Workflow | n8n | GoHighLevel | APIs).  
- **Use Cases:**  
  - Receive new Upwork jobs from Gmail alerts.  
  - Auto-score each job (0–10) with an explanation.  
  - Generate a tailored proposal draft referencing specific portfolio projects.  
  - Review high-fit jobs (7–10) in a Next.js dashboard and apply manually.

## 4. Architecture (V1)
```
Upwork Saved-Search Email → Gmail → n8n (self-hosted)
                              ↓
                   Parse job → Enrich → Score (DeepSeek) → Draft proposal
                              ↓
                         Supabase (DB)
                              ↓
                   Next.js Dashboard + Gmail notifications
```

## 5. Tech Stack
- **Orchestration:** n8n (self-hosted)  
- **Database:** Supabase (Postgres) — preferred over Google Sheets for structured queries, relations, and scalability.  
- **Intake:** Gmail (Upwork job-alert emails)  
- **Backend/Frontend:** Next.js (TypeScript)  
- **AI:** DeepSeek API (cost-effective alternative to OpenAI)  
- **Notifications:** Gmail (outbound summaries); optional Telegram/WhatsApp later.

## 6. Data Model (Supabase)
### 6.1 profiles
- id (uuid, pk)  
- name (text)  
- headline (text)  
- services (text[])  
- target_rate_min (numeric)  
- target_rate_max (numeric)  
- niches (text[])  
- created_at (timestamptz)  
- updated_at (timestamptz)

### 6.2 portfolio_projects
- id (uuid, pk)  
- title (text)  
- description (text)  
- skills (text[])  
- strength (text: high/medium/low)  
- implementation_status (text: designed/deployed/hybrid)  
- evidence_links (text[])  
- can_claim_text (text)  
- cannot_claim_text (text)  
- created_at (timestamptz)  
- updated_at (timestamptz)

### 6.3 jobs
- id (uuid, pk)  
- source (text: "upwork_email" | "upwork_api")  
- raw_payload (jsonb)  
- title (text)  
- description (text)  
- skills_requested (text[])  
- budget_min (numeric)  
- budget_max (numeric)  
- budget_type (text: fixed/hourly)  
- client_rating (numeric)  
- client_reviews_count (int)  
- client_jobs_posted (int)  
- client_hire_rate (numeric)  
- proposals_count (text: e.g., "<5", "5–10", "10–20", "20+")  
- posted_at (timestamptz)  
- url (text)  
- ingested_at (timestamptz)

### 6.4 job_scores
- id (uuid, pk)  
- job_id (uuid, fk → jobs.id)  
- profile_id (uuid, fk → profiles.id)  
- score_total (numeric)  
- confidence (numeric 0–1)  
- recommendation (text: APPLY | REVIEW | SKIP)  
- explanation (text)  
- factors (jsonb) — e.g., { "portfolio_match": 0.9, "skill_match": 0.8, ... }  
- created_at (timestamptz)

### 6.5 proposals
- id (uuid, pk)  
- job_id (uuid, fk → jobs.id)  
- draft_text (text)  
- angle (text)  
- used_projects (uuid[]) — references portfolio_projects.id  
- version (int)  
- created_at (timestamptz)  
- updated_at (timestamptz)

### 6.6 applications
- id (uuid, pk)  
- job_id (uuid, fk → jobs.id)  
- proposal_id (uuid, fk → proposals.id)  
- score_at_apply (numeric)  
- outcome (text: viewed | interview | hired | rejected | unknown)  
- notes (text)  
- applied_at (timestamptz)

## 7. Job Intake (Gmail → n8n)
- **Trigger:** New email in Gmail with subject containing "Upwork" and sender domain "upwork.com".  
- **Parser:** Extract job title, description, skills, budget, client info, proposals count, posted time, and job URL from email body.  
- **Validation:** If critical fields missing, flag for manual review.  
- **Storage:** Insert into `jobs` table with `source = "upwork_email"`.

## 8. Scoring Engine (DeepSeek via n8n)
### 8.1 Scoring Factors & Weights
- Direct portfolio match — 25%  
- Skill match — 20%  
- Relevant experience — 15%  
- Client quality — 10%  
- Budget/rate fit — 10%  
- Job requirements fit — 10%  
- Competition/proposal count — 5%  
- Red flags — 5%  

### 8.2 Recommendation Bands
- 9.0–10.0 → APPLY (high priority)  
- 8.0–8.9 → APPLY (strong)  
- 7.0–7.9 → REVIEW (consider)  
- 6.0–6.9 → REVIEW (usually skip)  
- 0–5.9 → SKIP  

### 8.3 Output Requirements
- `score_total` (0–10)  
- `confidence` (0–1) — based on data completeness  
- `recommendation` (APPLY/REVIEW/SKIP)  
- `explanation` — human-readable "Why this score" with strengths, weaknesses, and a clear recommendation.  
- `factors` — machine-readable factor scores for analytics.

## 9. Proposal Generator (DeepSeek via n8n)
### 9.1 Inputs to AI
- Job requirements (parsed fields + description)  
- Matched skills (from profile + portfolio)  
- Specific portfolio projects (title, can_claim_text, evidence_links)  
- Limitations (cannot_claim_text, implementation_status)  
- Client pain points (inferred from description)  
- Recommended angle (e.g., "portfolio-first: booking workflow")  

### 9.2 Guardrails
- Never invent experience. Use only `can_claim_text`.  
- Include a short proof line when relevant (e.g., "See FigJam workflow + video").  
- Keep tone specific to the job's bottleneck (avoid generic intros).  

### 9.3 Output
- `draft_text` — tailored proposal (150–250 words).  
- `angle` — one-line strategy note.  
- `used_projects` — list of portfolio project IDs referenced.

## 10. Next.js Dashboard (TypeScript)
### 10.1 Pages
- **/dashboard** — List of new jobs with score, recommendation, budget, client rating, proposals count, posted time.  
- **/jobs/[id]** — Job detail: parsed fields, score explanation, factors, proposal draft, "Copy proposal" button, job URL.  
- **/applications** — Tracker: jobs applied, outcomes (viewed/interview/hired), notes.  
- **/settings** — Profile and portfolio management (CRUD).  

### 10.2 Filters
- Score range (7–10 default)  
- Category/skills (Automation, AI, n8n, GoHighLevel, SaaS)  
- Budget ($300+)  
- Client rating (4.5+)  
- Posted window (Last 24 hours)  

### 10.3 Actions
- View job (open Upwork URL)  
- Generate proposal (on-demand re-run)  
- Copy proposal to clipboard  
- Mark as applied / skip  
- Log outcome (viewed/interview/hired)

## 11. Notifications (Gmail)
- **Daily digest:** Email summary of high-fit jobs (score ≥ 7) with links to dashboard.  
- **Instant alert (optional):** Email when a job scores ≥ 9.0 within 15 minutes of ingest.

## 12. Security & Privacy
- Store only necessary PII; redact sensitive client details if present.  
- Use environment variables for API keys (n8n, Supabase, DeepSeek, Gmail).  
- Restrict dashboard access (simple auth or Vercel protection).

## 13. Analytics & Learning Loop
- Track: score_at_apply, proposal angle, budget band, outcome.  
- Compute: interview rate by score band, budget range, and angle.  
- Use insights to adjust scoring weights and proposal templates.

## 14. Milestones (V1)
1. **M1 — Intake:** Gmail → n8n parser → Supabase `jobs`.  
2. **M2 — Scoring:** DeepSeek scoring + explanation → `job_scores`.  
3. **M3 — Proposals:** DeepSeek proposal drafts → `proposals`.  
4. **M4 — Dashboard:** Next.js pages + filters + actions.  
5. **M5 — Notifications:** Daily digest + instant alert (optional).  
6. **M6 — Tracker:** Applications log + outcomes.

## 15. Acceptance Criteria (V1)
- New Upwork job-alert emails are ingested and parsed into structured records within 5 minutes.  
- Each job receives a score (0–10) with explanation and recommendation.  
- High-fit jobs (≥ 7) appear in the dashboard with a tailored proposal draft.  
- You can copy the proposal and apply manually on Upwork.  
- No automation violates Upwork's ToU (no scraping/auto-submit). [web:1][web:2]

## 16. Risks & Mitigations
- **Email parsing variability:** Add manual review queue for low-confidence parses.  
- **AI overclaiming:** Enforce "can_claim_text" only; include cannot_claim_text in prompt constraints.  
- **API costs:** Use DeepSeek; cache AI responses; limit re-runs.  
- **Compliance:** Keep submission manual; use supported intake channels. [web:1][web:2]

## 17. Future Enhancements (Post-V1)
- Upwork API integration (if eligible) for richer job data. [web:2]  
- Telegram/WhatsApp notifications.  
- Multi-profile support (different niches/rates).  
- A/B testing of proposal angles.  
- Automated follow-up reminders.

---
**References**  
[web:1] Upwork Terms of Use — automation/scraping restrictions.  
[web:2] Upwork API — eligibility and permitted use cases.

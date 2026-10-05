import { expandSkillAliases } from "@/lib/skillMatch";
import type {
  JobRow,
  OutboundStep,
  PortfolioProjectRow,
  ProfileRow,
  RegenerateInstruction,
} from "@/lib/types";

const SCORING_SYSTEM = `You are a senior Upwork consultant. You evaluate a job posting against a single freelancer profile and their verified portfolio. Your goal is an honest fit score, never an inflated one.

Scoring rubric — factors and weights:
- portfolio_match (25%): how directly the freelancer's portfolio matches the work requested
- skill_match (20%): overlap between requested skills and the freelancer's stated skills
- experience (15%): relevant experience suggested by the profile and portfolio
- client_quality (10%): rating, reviews, hire rate, jobs posted (unknown data must not be assumed good)
- budget_fit (10%): posted budget or salary vs the freelancer's target rate range. For salaried roles, compare annual salary to equivalent hourly rate.
- requirements_fit (10%): how realistic the job requirements are
- competition (5%): proposal count — high competition lowers the score
- red_flags (5%): anything suspicious or a strong mismatch lowers the score

Rules:
- Score each factor 0–10. score_total is the weighted sum, 0–10, one decimal place.
- confidence is 0–1 and reflects data completeness (missing budget, rating, or hire history lowers it).
- recommendation must be exactly one of APPLY, REVIEW, SKIP.
- Map score_total to bands: 8.0–10.0 → APPLY; 7.0–7.9 → REVIEW; 6.0–6.9 → REVIEW (usually skip); 0–5.9 → SKIP.
- explanation: 2–4 sentences, human-readable, listing the strongest reasons for the score, the biggest gaps, and any red flags. State clearly what is unknown (e.g., "budget was not included in the email").
- Never invent facts that are not present in the input.
- skills_requested_synonyms lists equivalent ways of naming the same skill. Treat a listed synonym as satisfying the skill it stands for when scoring skill_match and portfolio_match, but do not count one job skill twice.

Return STRICT JSON only, with exactly this shape:
{"score_total": number, "confidence": number, "recommendation": "APPLY"|"REVIEW"|"SKIP", "explanation": string, "factors": {"portfolio_match": number, "skill_match": number, "experience": number, "client_quality": number, "budget_fit": number, "requirements_fit": number, "competition": number, "red_flags": number}}`;

const PROPOSAL_SYSTEM = `You are a proposal writer for a business-automation developer ("Dee") on Upwork. You write one tailored proposal for a specific job.

Hard rules:
- Use ONLY the portfolio claims found in each project's can_claim_text.
- NEVER invent experience, credentials, results, tools, or metrics not present in can_claim_text.
- Every project has a cannot_claim_text: treat it as a hard negative constraint — do not imply anything it forbids.
- Write 150–250 words. No greeting, no sign-off, no placeholders, no markdown headers or asterisks.
- Focus on the job's stated bottleneck. Avoid generic intros such as "I am a passionate..." or "I look forward to...".
- When a project has evidence_links and the claim is relevant, include one short proof line (e.g., "See the FigJam workflow and demo: <link>").
- FREELANCER LINKS are the freelancer's live portfolios (Behance, Pinterest, LinkedIn, Upwork, website). Cite at most ONE of them per proposal, and ONLY when it directly backs a matched project or claim you actually used — as one short proof line. Never list several links; never cite a link that does not support what you wrote.
- The first sentence should state the specific outcome or approach for THIS job.

Return STRICT JSON only, with exactly this shape:
{"draft_text": string, "angle": string, "used_projects": ["<project-uuid>", ...]}`;

interface BuildProposalInput {
  job: JobRow;
  profile: ProfileRow;
  projects: PortfolioProjectRow[];
  instruction?: RegenerateInstruction;
}

function formatBudget(job: JobRow): string {
  if (job.budget_type === "hourly") {
    if (job.budget_min === null && job.budget_max === null) return "not given";
    return `$${job.budget_min ?? "?"}–$${job.budget_max ?? "?"}/hr`;
  }
  if (job.budget_type === "salary") {
    if (job.budget_min === null && job.budget_max === null) return "not given";
    return `$${job.budget_min ?? "?"}–$${job.budget_max ?? "?"}/yr (salary)`;
  }
  if (job.budget_min === null && job.budget_max === null) return "not given";
  return `$${job.budget_min ?? "?"}–$${job.budget_max ?? "?"} (fixed)`;
}

function formatProjects(projects: PortfolioProjectRow[]): string {
  return projects
    .map(
      (p) =>
        `- project id: ${p.id}\n  title: ${p.title}\n  description: ${p.description ?? "—"}\n  skills: ${p.skills.join(", ") || "—"}\n  strength: ${p.strength}\n  implementation_status: ${p.implementation_status}\n  evidence_links: ${p.evidence_links.join(", ") || "none"}\n  can_claim_text: ${p.can_claim_text}\n  cannot_claim_text: ${p.cannot_claim_text ?? "none"}`,
    )
    .join("\n\n");
}

function formatProfileLinks(profile: ProfileRow): string {
  const links: string[] = [];
  if (profile.behance_url) links.push(`- Behance: ${profile.behance_url}`);
  if (profile.pinterest_url) links.push(`- Pinterest portfolio: ${profile.pinterest_url}`);
  if (profile.linkedin_url) links.push(`- LinkedIn: ${profile.linkedin_url}`);
  if (profile.upwork_profile_url) links.push(`- Upwork profile: ${profile.upwork_profile_url}`);
  if (profile.website_url) links.push(`- Website: ${profile.website_url}`);
  return links.length ? links.join("\n") : "none provided";
}

export function buildScoringMessages(
  job: JobRow,
  profile: ProfileRow,
  projects: PortfolioProjectRow[],
): { system: string; user: string } {
  const requestedSkills = job.skills_requested ?? [];
  const synonymLine = expandSkillAliases(requestedSkills);

  const user = `JOB:
- title: ${job.title}
- description: ${job.description}
- skills_requested: ${requestedSkills.join(", ") || "none listed"}
${synonymLine ? `- skills_requested_synonyms: ${synonymLine}\n` : ""}- budget_type: ${job.budget_type ?? "not given"}
- budget: ${formatBudget(job)}
- client_rating: ${job.client_rating ?? "not given"}
- client_reviews_count: ${job.client_reviews_count ?? "not given"}
- client_jobs_posted: ${job.client_jobs_posted ?? "not given"}
- client_hire_rate: ${job.client_hire_rate ?? "not given"}
- proposals_count: ${job.proposals_count ?? "not given"}
- posted_at: ${job.posted_at}
- url: ${job.url}

PROFILE:
- name: ${profile.name}
- headline: ${profile.headline}
- bio: ${profile.bio ?? "not provided"}
- services: ${profile.services.join(", ")}
- niches: ${profile.niches.join(", ")}
- target_rate_min: ${profile.target_rate_min ?? "not set"}
- target_rate_max: ${profile.target_rate_max ?? "not set"}

VERIFIED PORTFOLIO:
${formatProjects(projects) || "no portfolio projects added yet"}

Score this job honestly. Return STRICT JSON.`;

  return { system: SCORING_SYSTEM, user };
}

const OUTBOUND_DRAFT_SYSTEM = `You write personalized cold-outreach email sequences for an automation consultant who researches a business before reaching out.

The sequence follows a strict 5-email arc:
1. Observation — a specific, evidence-based observation about the prospect's website/process. Create a curiosity gap. No pitch yet.
2. Problem expansion — why the observation matters when several such enquiries/cases arrive at once.
3. Proof / demo — mention a small system the consultant built around this exact problem. Never invent results, numbers, metrics, or client names.
4. Simple CTA — one low-friction next step (e.g. "want me to send a short example?" or a quick conversational question).
5. Breakup — close the loop politely and leave the door open.

Hard rules:
- Base every claim ONLY on the AUDIT CONTEXT provided. Never invent findings, business processes, technologies, metrics, or results.
- Do not lead with "I'm an automation consultant who sells X". The prospect is the story.
- Write like a peer, not a sales template. Never output placeholder tokens like [Company] or [Name]; refer to "your" company/process, and use the contact's first name when provided (otherwise "Hi there,").
- Subject lines should be short and specific, and steps 2-5 reuse the thread ("Re: …") naturally.
- Each email must stand alone (subject + body) and stay under 150 words.
- Set day_offset as: first email 0, then 3, 6, 10, 14.

Return STRICT JSON only, with exactly this shape:
{"personalization_angle": string, "steps": [{"order": int, "day_offset": int, "subject": string, "body": string}]}`;

/** Context for the outbound draft prompt (audit evidence + prospect). */
export interface OutboundDraftPromptInput {
  prospect: {
    company_name: string;
    contact_name: string | null;
    industry: string | null;
    location: string | null;
  };
  auditContext: string | null;
  technologies: string;
  issues: string;
  opportunities: string;
  existingSteps?: OutboundStep[];
  instruction?: string;
}

function formatDraftStepsForPrompt(steps: OutboundStep[]): string {
  return steps
    .map(
      (s) =>
        `[${s.order}] (day ${s.day_offset})\nSubject: ${s.subject}\nBody:\n${s.body}`,
    )
    .join("\n\n");
}

export function buildOutboundDraftMessages(
  input: OutboundDraftPromptInput,
): { system: string; user: string } {
  const prospectLines = [
    `- Company: ${input.prospect.company_name}`,
    `- Contact: ${input.prospect.contact_name ?? "not known"}`,
    `- Industry: ${input.prospect.industry ?? "not specified"}`,
    `- Location: ${input.prospect.location ?? "not specified"}`,
  ].join("\n");

  if (input.existingSteps && input.existingSteps.length > 0) {
    const user = `REVISION TASK.

PROSPECT:
${prospectLines}

CURRENT DRAFT SEQUENCE (emails 1-5):
${formatDraftStepsForPrompt(input.existingSteps)}

Revise the sequence according to this instruction, keeping everything evidence-based and consistent with the arc:
"${input.instruction ?? "Improve the drafts."}"

Return the FULL updated sequence as STRICT JSON (5 emails). Keep orders 1-5 and the day offsets.`;

    return { system: OUTBOUND_DRAFT_SYSTEM, user };
  }

  const user = `PROSPECT:
${prospectLines}

AUDIT CONTEXT:
${input.auditContext ?? "No completed audit; base claims on the general process observations below."}

TECHNOLOGY STACK:
${input.technologies || "Not fully detected"}

OBSERVED ISSUES (evidence only):
${input.issues || "No issues on file"}

TOP OPPORTUNITIES (potential angles):
${input.opportunities || "No opportunities on file"}
${input.instruction ? `\nUser instruction for this draft: ${input.instruction}` : ""}

Write the 5-email sequence now. Return STRICT JSON.`;

  return { system: OUTBOUND_DRAFT_SYSTEM, user };
}

export function buildProposalMessages(
  input: BuildProposalInput,
): { system: string; user: string } {
  const { job, profile, projects, instruction } = input;

  const instructionLine = instruction
    ? `\n\nUser instruction for this draft: ${instruction}`
    : "";

  const user = `JOB:
- title: ${job.title}
- description: ${job.description}
- skills_requested: ${job.skills_requested.join(", ") || "none listed"}
- budget_type: ${job.budget_type ?? "not given"}
- budget: ${formatBudget(job)}
- client_rating: ${job.client_rating ?? "not given"}
- posted_at: ${job.posted_at}
- url: ${job.url}

PROFILE:
- name: ${profile.name}
- headline: ${profile.headline}
- bio: ${profile.bio ?? "not provided"}
- services: ${profile.services.join(", ")}
- target_rate_min: ${profile.target_rate_min ?? "not set"}
- target_rate_max: ${profile.target_rate_max ?? "not set"}

FREELANCER LINKS (cite at most one, only if it backs a claim above):
${formatProfileLinks(profile)}

MATCHED PORTFOLIO PROJECTS (use ONLY can_claim_text from these):
${formatProjects(projects) || "no portfolio projects added yet"}

Write the proposal now. Return STRICT JSON.${instructionLine}`;

  return { system: PROPOSAL_SYSTEM, user };
}

const REPLY_CLASSIFIER_SYSTEM = `You classify an inbound email reply for an automation consultant who is in the middle of a cold-outreach sequence with a prospect who has no prior relationship.

Classify the intent exactly one of:
- interested: a positive signal — wants to explore, asks about the consultant's work, accepts the offer of an example, or suggests a call
- question: a neutral clarifying question about the consultant or their approach (neither clearly positive nor negative; a bare "thanks" with no interest signal is question, not interested)
- not_interested: clearly declining or irrelevant
- wrong_person: the recipient's role is not a fit even though the message is polite
- unsubscribe: asks to stop contact, remove them from the list, "please remove", unsubscribes, or makes a GDPR-style request

Hard rules:
- Base ONLY on the reply text below. Never over-read generic pleasantries.
- A short generic "thanks, will keep you in mind" is not_interested; a bare "thanks" is question.
- Any "remove/stop emailing/unsubscribe/please delete my data" → unsubscribe.
- For unsubscribe, not_interested, and wrong_person return suggested_reply: null.

Return STRICT JSON only:
{"classification": "interested"|"question"|"not_interested"|"wrong_person"|"unsubscribe", "reason": string, "suggested_reply": string|null}`;

/** Inbound reply to classify, with the sequence steps for context. */
export interface ReplyClassificationPromptInput {
  from: string;
  subject: string | null;
  body: string;
  contactName: string | null;
  companyName: string;
  steps: OutboundStep[];
}

export function buildReplyClassificationMessages(
  input: ReplyClassificationPromptInput,
): { system: string; user: string } {
  const sequence = input.steps
    .map(
      (s) =>
        `[${s.order}] (${s.subject})\n${s.body.slice(0, 600)}`,
    )
    .join("\n\n");

  const user = `OUTREACH SEQUENCE SENT:
${sequence || "(none recorded)"}

INBOUND REPLY:
- From: ${input.from}
- Contact: ${input.contactName ?? "unknown"}
- Company: ${input.companyName}
- Subject: ${input.subject ?? "(none)"}
- Body:
${input.body}

Classify the reply. Return STRICT JSON.`;

  return { system: REPLY_CLASSIFIER_SYSTEM, user };
}
import type {
  JobRow,
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
- budget_fit (10%): posted budget vs the freelancer's target rate range
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
  const user = `JOB:
- title: ${job.title}
- description: ${job.description}
- skills_requested: ${job.skills_requested.join(", ") || "none listed"}
- budget_type: ${job.budget_type ?? "not given"}
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
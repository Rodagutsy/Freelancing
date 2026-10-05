import { chatJson } from "@/lib/ai/deepseek";
import {
  coverLetterOutputSchema,
  type CoverLetterInput,
  type CoverLetterOutput,
} from "@/lib/schemas/coverLetter";
import { listPortfolioProjects } from "@/lib/services/portfolio";
import { resolveProfile } from "@/lib/services/settings";
import type {
  DatabaseClient,
  PortfolioProjectRow,
  ProfileRow,
} from "@/lib/types";

const STRENGTH_ORDER: Record<PortfolioProjectRow["strength"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const COVER_LETTER_SYSTEM = `You write a standalone cover letter for a freelance automation consultant applying to a role that has no Upwork job posting.

Hard rules:
- Ground every claim in the VERIFIED PORTFOLIO below. Use ONLY what each project's can_claim_text supports.
- NEVER invent experience, credentials, results, clients, metrics or employers.
- A project's cannot_claim_text is a hard constraint — do not imply anything it forbids.
- Write 250–400 words in plain prose. No subject line, no markdown, no asterisks, no bullet points, no placeholder tokens.
- Open with the specific problem this role describes and what you would do about it — not with your name.
- Close with one low-friction ask (e.g. a short call to scope the work).
- Match the language of the job description. If it is not written in English, write in that language.

Return STRICT JSON only, with exactly this shape:
{"letter_text": string, "angle": string, "used_projects": ["<project-uuid>", ...]}`;

function formatProjects(projects: PortfolioProjectRow[]): string {
  return projects
    .map(
      (p) =>
        `- project id: ${p.id}\n  title: ${p.title}\n  skills: ${p.skills.join(", ") || "—"}\n  can_claim_text: ${p.can_claim_text}\n  cannot_claim_text: ${p.cannot_claim_text ?? "none"}`,
    )
    .join("\n\n");
}

/**
 * Generates a cover letter from a pasted job description, grounded in the
 * freelancer's persona and verified portfolio. Nothing is persisted — the
 * caller copies the text out.
 */
export async function generateCoverLetter(
  client: DatabaseClient,
  input: CoverLetterInput,
  profileId?: string,
): Promise<CoverLetterOutput> {
  const profile = await resolveProfile(client, profileId);
  const projects = await listPortfolioProjects(client);
  // There is no skills_requested to match against here, so the prompt gets the
  // strongest projects first and the AI is told to cite only what fits.
const used = [...projects]
  .sort(
    (a, b) =>
      STRENGTH_ORDER[b.strength] - STRENGTH_ORDER[a.strength] ||
      a.title.localeCompare(b.title),
  )
  .slice(0, 4);

  const user = `ROLE:
- title: ${input.jobTitle}
- company: ${input.companyName ?? "not specified"}
- description:
${input.jobDescription}

PROFILE:
- name: ${profile.name}
- headline: ${profile.headline}
- bio: ${profile.bio ?? "not provided"}
- services: ${profile.services.join(", ")}
- niches: ${profile.niches.join(", ")}
- target_rate_min: ${profile.target_rate_min ?? "not set"}
- target_rate_max: ${profile.target_rate_max ?? "not set"}

FREELANCER LINKS (cite at most one, only if it backs a claim above):
${formatProfileLinks(profile)}

VERIFIED PORTFOLIO (the only evidence you may cite):
${formatProjects(used) || "no portfolio projects added yet"}

Write the cover letter now. Return STRICT JSON.`;

  const raw = await chatJson<unknown>(COVER_LETTER_SYSTEM, user, {
    temperature: 0.6,
    maxTokens: 1500,
  });

  return coverLetterOutputSchema.parse(raw);
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
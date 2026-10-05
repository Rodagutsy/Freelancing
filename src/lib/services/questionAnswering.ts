import { chatJson } from "@/lib/ai/deepseek";
import {
  applicationQAOutputSchema,
  type ApplicationQAOutput,
} from "@/lib/schemas/questionAnswering";
import { matchPortfolioProjects } from "@/lib/services/jobs";
import { listPortfolioProjects } from "@/lib/services/portfolio";
import { resolveProfile } from "@/lib/services/settings";
import type {
  DatabaseClient,
  JobRow,
  PortfolioProjectRow,
  ProfileRow,
} from "@/lib/types";

const QA_SYSTEM = `You answer Upwork application screening questions on behalf of a freelancer.

Hard rules:
- Ground every claim in the VERIFIED PORTFOLIO below. Use ONLY what each project's can_claim_text supports.
- NEVER invent experience, credentials, results, clients, metrics, tools or availability that is not stated in the input.
- A project's cannot_claim_text is a hard constraint — do not imply anything it forbids.
- If the input does not support an answer, say so plainly in one sentence and give the honest answer anyway (e.g. "I haven't worked with X yet — here's how I'd approach it"). Never fabricate to fill the gap.
- Write in first person as the freelancer. No greeting, no sign-off, no markdown, no bullet characters.
- 50–150 words per answer. Direct and specific; skip filler like "I am a passionate…".

Return STRICT JSON only, with exactly this shape:
{"answers": [{"question": string, "answer": string}]}`;

/** Keeps the question text the client sent so the UI can key off it. */
function normalizeQuestions(questions: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const question of questions) {
    const trimmed = question.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
  }
  return output;
}

function formatProjects(projects: PortfolioProjectRow[]): string {
  return projects
    .map(
      (p) =>
        `- title: ${p.title}\n  skills: ${p.skills.join(", ") || "—"}\n  can_claim_text: ${p.can_claim_text}\n  cannot_claim_text: ${p.cannot_claim_text ?? "none"}`,
    )
    .join("\n\n");
}

function buildUserMessage(
  job: JobRow,
  profile: ProfileRow,
  projects: PortfolioProjectRow[],
  questions: string[],
): string {
  return `JOB:
- title: ${job.title}
- description: ${job.description}
- skills_requested: ${job.skills_requested.join(", ") || "none listed"}
- budget: ${job.budget_type ?? "not given"} ${job.budget_min ?? "?"}–${job.budget_max ?? "?"}
- posted_at: ${job.posted_at}

PROFILE:
- name: ${profile.name}
- headline: ${profile.headline}
- bio: ${profile.bio ?? "not provided"}
- services: ${profile.services.join(", ")}
- target_rate_min: ${profile.target_rate_min ?? "not set"}
- target_rate_max: ${profile.target_rate_max ?? "not set"}

VERIFIED PORTFOLIO (the only evidence you may cite):
${formatProjects(projects) || "no portfolio projects added yet"}

QUESTIONS TO ANSWER:
${questions.map((question, index) => `[${index + 1}] ${question}`).join("\n")}

Answer all ${questions.length} question${questions.length === 1 ? "" : "s"} in the same order. Return STRICT JSON.`;
}

/**
 * Drafts answers to Upwork screening questions, grounded in the freelancer's
 * profile and verified portfolio. Answers are ephemeral — nothing is persisted.
 */
export async function answerApplicationQuestions(
  client: DatabaseClient,
  jobId: string,
  questions: string[],
  profileId?: string,
): Promise<ApplicationQAOutput> {
  const normalized = normalizeQuestions(questions);
  if (normalized.length === 0) {
    throw new Error("Add at least one question to answer.");
  }

  const { data: jobData, error: jobError } = await client
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    throw new Error(jobError.message);
  }
  if (!jobData) {
    throw new Error("Job not found.");
  }

  const profile = await resolveProfile(client, profileId);
  const projects = await listPortfolioProjects(client);
  const job = jobData as JobRow;
  const matched = matchPortfolioProjects(projects, job.skills_requested, 4);

  const raw = await chatJson<unknown>(
    QA_SYSTEM,
    buildUserMessage(job, profile, matched, normalized),
    { temperature: 0.5, maxTokens: 1500 },
  );

  const parsed = applicationQAOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Couldn't draft those answers cleanly. Try again.");
  }

  // Re-attach the caller's question text so each card is labelled by the
  // question they typed, even if the model reworded or reordered its output.
  const generated = parsed.data.answers;
  const byText = new Map(
    generated.map((entry) => [entry.question.trim().toLowerCase(), entry.answer]),
  );
  const positional = generated.length === normalized.length;

  const answers = normalized.map((question, index) => ({
    question,
    answer:
      byText.get(question.trim().toLowerCase()) ??
      (positional ? generated[index].answer : "") ??
      "",
  }));

  return {
    answers: answers.map((entry) =>
      entry.answer
        ? entry
        : { ...entry, answer: "No answer was generated for this one — try again." },
    ),
  };
}
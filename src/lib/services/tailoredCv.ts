import { chatJson } from "@/lib/ai/deepseek";
import { buildTailoredCvMessages } from "@/lib/ai/prompts";
import { tailoredCvOutputSchema, type TailoredCvOutput } from "@/lib/schemas/tailoredCv";
import { listPortfolioProjects } from "@/lib/services/portfolio";
import { resolveProfile } from "@/lib/services/settings";
import type { DatabaseClient, JobRow } from "@/lib/types";

/**
 * Generates a CV tailored to a job, reorganized from the persona's master CV.
 * Nothing is persisted — the caller copies or downloads the text.
 *
 * Throws a friendly error if the persona has no master CV on file.
 */
export async function generateTailoredCv(
  client: DatabaseClient,
  jobId: string,
  profileId?: string,
): Promise<TailoredCvOutput> {
  const { data: jobData, error: jobError } = await client
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) throw new Error(jobError.message);
  if (!jobData) throw new Error("Job not found.");

  const profile = await resolveProfile(client, profileId);
  if (!profile.master_cv_text) {
    throw new Error(
      `"${profile.label}" has no master CV yet. Upload one in Settings, then try again.`,
    );
  }

  const projects = await listPortfolioProjects(client, profile.user_id ?? undefined);
  const { system, user } = buildTailoredCvMessages({
    masterCv: profile.master_cv_text,
    job: jobData as JobRow,
    profile,
    projects,
  });

  const raw = await chatJson<unknown>(system, user, {
    temperature: 0.5,
    maxTokens: 2000,
  });

  return tailoredCvOutputSchema.parse(raw);
}

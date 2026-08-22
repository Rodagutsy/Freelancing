import { chatJson } from "@/lib/ai/deepseek";
import { buildScoringMessages } from "@/lib/ai/prompts";
import { scoreOutputSchema } from "@/lib/schemas/proposal";
import { listPortfolioProjects } from "@/lib/services/portfolio";
import { getProfile } from "@/lib/services/settings";
import type { DatabaseClient, JobRow, JobScoreRow } from "@/lib/types";

/**
 * Scores a job against Dee's profile and portfolio (mirrors the n8n M2
 * scoring step so jobs added manually get the same treatment as email alerts).
 */
export async function scoreJob(
  client: DatabaseClient,
  jobId: string,
): Promise<JobScoreRow> {
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

  const profile = await getProfile(client);
  if (!profile) {
    throw new Error(
      "Your profile is required to score jobs. Add it in Settings first.",
    );
  }

  const projects = await listPortfolioProjects(client);
  const { system, user } = buildScoringMessages(
    jobData as JobRow,
    profile,
    projects,
  );

  const raw = await chatJson<unknown>(system, user, {
    temperature: 0.3,
    maxTokens: 1200,
  });
  const output = scoreOutputSchema.parse(raw);

  const { data, error } = await client
    .from("job_scores")
    .insert({
      job_id: jobId,
      profile_id: profile.id,
      score_total: output.score_total,
      confidence: output.confidence,
      recommendation: output.recommendation,
      explanation: output.explanation,
      factors: output.factors,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as JobScoreRow;
}
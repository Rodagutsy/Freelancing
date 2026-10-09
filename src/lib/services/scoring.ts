import { chatJson } from "@/lib/ai/deepseek";
import { buildScoringMessages } from "@/lib/ai/prompts";
import { scoreOutputSchema } from "@/lib/schemas/proposal";
import { listPortfolioProjects } from "@/lib/services/portfolio";
import { getProfiles, resolveProfile } from "@/lib/services/settings";
import type { DatabaseClient, JobRow, JobScoreRow, ProfileRow } from "@/lib/types";

/**
 * Scores a job against a persona (default persona when no id is given) and the
 * shared portfolio. Mirrors the n8n scoring workflow so jobs added manually get
 * the same treatment as automated intake.
 *
 * Re-scoring the same (job, persona) updates the existing row rather than
 * stacking a new one (unique index idx_job_scores_job_persona).
 */
export async function scoreJob(
  client: DatabaseClient,
  jobId: string,
  profileId?: string,
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

  const profile = await resolveProfile(client, profileId);
  return scoreJobForProfile(client, jobData as JobRow, profile);
}

async function scoreJobForProfile(
  client: DatabaseClient,
  job: JobRow,
  profile: ProfileRow,
): Promise<JobScoreRow> {
  const projects = await listPortfolioProjects(client, profile.user_id ?? undefined);
  const { system, user } = buildScoringMessages(job, profile, projects);

  const raw = await chatJson<unknown>(system, user, {
    temperature: 0.3,
    maxTokens: 1200,
  });
  const output = scoreOutputSchema.parse(raw);

  const { data, error } = await client
    .from("job_scores")
    .upsert(
      {
        user_id: profile.user_id,
        job_id: job.id,
        profile_id: profile.id,
        score_total: output.score_total,
        confidence: output.confidence,
        recommendation: output.recommendation,
        explanation: output.explanation,
        factors: output.factors,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,job_id,profile_id" },
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as JobScoreRow;
}

/**
 * Scores a job against every persona. Returns one result per persona in the
 * order they were resolved (profiles come back sorted). Failures on individual
 * personas are reported but do not abort the whole run.
 */
export async function scoreJobForAllPersonas(
  client: DatabaseClient,
  jobId: string,
  profiles?: ProfileRow[],
): Promise<{ scores: JobScoreRow[]; failures: Array<{ label: string; error: string }> }> {
  const { data: jobData, error: jobError } = await client
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) throw new Error(jobError.message);
  if (!jobData) throw new Error("Job not found.");

  const job = jobData as JobRow;
  const list = profiles ?? (await getProfiles(client));
  if (list.length === 0) {
    throw new Error("No personas yet — create one in Settings first.");
  }

  const scores: JobScoreRow[] = [];
  const failures: Array<{ label: string; error: string }> = [];

  for (const profile of list) {
    try {
      scores.push(await scoreJobForProfile(client, job, profile));
    } catch (error) {
      failures.push({
        label: profile.label,
        error: error instanceof Error ? error.message : "Scoring failed.",
      });
    }
  }

  return { scores, failures };
}

/**
 * Scores a batch of jobs against every persona. Used by the score-backfill
 * action. Caps work with `limit` so a single request can't run forever.
 */
export async function scoreJobsForAllPersonas(
  client: DatabaseClient,
  jobIds: string[],
  limit = 25,
): Promise<{ scored: number; skipped: number; failures: string[] }> {
  const profiles = await getProfiles(client);
  if (profiles.length === 0) {
    throw new Error("No personas yet — create one in Settings first.");
  }

  const failures: string[] = [];
  let scored = 0;
  let skipped = 0;

  for (const jobId of jobIds) {
    if (scored >= limit) {
      skipped += 1;
      continue;
    }
    try {
      const result = await scoreJobForAllPersonas(client, jobId, profiles);
      if (result.scores.length > 0) scored += 1;
      if (result.failures.length > 0) {
        failures.push(
          `${jobId}: ${result.failures.map((f) => f.label).join(", ")} failed`,
        );
      }
    } catch (error) {
      failures.push(
        `${jobId}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  return { scored, skipped, failures };
}

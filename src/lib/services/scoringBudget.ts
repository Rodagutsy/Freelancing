import type { DatabaseClient } from "@/lib/types";

/**
 * Weekly DeepSeek scoring budget.
 *
 * Every score is one AI call (one per job per persona), so this is the main
 * cost lever for the automated ATS intake. When the budget is spent, new jobs
 * are still imported but not scored — and scoring resumes automatically once
 * the rolling 7-day window frees up capacity.
 *
 * Env knob: INTAKE_WEEKLY_SCORE_LIMIT (default 50). Set to 0 to disable
 * automatic scoring entirely.
 */
export function weeklyScoreLimit(): number {
  const raw = process.env.INTAKE_WEEKLY_SCORE_LIMIT;
  if (!raw) return 50;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 50;
}

function weekAgoIso(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

/** Scoring calls (job_scores rows) written in the last 7 days. */
export async function countScoresThisWeek(
  client: DatabaseClient,
  userId?: string,
): Promise<number> {
  let query = client
    .from("job_scores")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgoIso());
  if (userId) query = query.eq("user_id", userId);

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Scoring calls still allowed this week for a user (or globally). */
export async function remainingScoreBudget(
  client: DatabaseClient,
  userId?: string,
): Promise<number> {
  const limit = weeklyScoreLimit();
  if (limit <= 0) return 0;
  const used = await countScoresThisWeek(client, userId);
  return Math.max(0, limit - used);
}

import { matchSkills, type SkillMatch } from "@/lib/skillMatch";
import type {
  DatabaseClient,
  JobFeedRow,
  PortfolioProjectRow,
  Recommendation,
} from "@/lib/types";

export interface JobListQuery {
  scoreMin?: number;
  scoreMax?: number;
  postedHours?: number;
  budgetMin?: number;
  clientRating?: number;
  skills?: string[];
  status?: "apply" | "review" | "skip" | "all";
  page?: number;
  limit?: number;
  sort?: "score_desc" | "newest";
}

export interface JobListResult {
  items: JobFeedRow[];
  total: number;
  page: number;
  pageCount: number;
}

const STATUS_BANDS: Record<
  string,
  { min: number; max: number } | null
> = {
  apply: { min: 9, max: 10 },
  review: { min: 7, max: 8.99 },
  skip: { min: 0, max: 6.99 },
  all: null,
};

export async function listJobs(
  client: DatabaseClient,
  query: JobListQuery = {},
): Promise<JobListResult> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 20));
  const sort = query.sort ?? "score_desc";

  let q = client.from("job_feed").select("*", { count: "exact" });

  const band = STATUS_BANDS[query.status ?? "all"] ?? null;
  const min = query.scoreMin ?? band?.min;
  const max = query.scoreMax ?? band?.max;
  if (min !== undefined) q = q.gte("score_total", min);
  if (max !== undefined) q = q.lte("score_total", max);

  if (query.postedHours && query.postedHours > 0) {
    const cutoff = new Date(
      Date.now() - query.postedHours * 60 * 60 * 1000,
    ).toISOString();
    q = q.gte("posted_at", cutoff);
  }

  if (query.budgetMin !== undefined && query.budgetMin > 0) {
    q = q.or(
      `budget_max.gte.${query.budgetMin},budget_min.gte.${query.budgetMin}`,
    );
  }

  if (query.clientRating !== undefined && query.clientRating > 0) {
    q = q.gte("client_rating", query.clientRating);
  }

  if (query.skills && query.skills.length > 0) {
    q = q.overlaps("skills_requested", query.skills);
  }

  if (sort === "newest") {
    q = q.order("posted_at", { ascending: false });
  } else {
    q = q
      .order("score_total", { ascending: false, nullsFirst: false })
      .order("posted_at", { ascending: true });
  }

  const from = (page - 1) * limit;
  const { data, count, error } = await q.range(from, from + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data ?? []) as JobFeedRow[],
    total: count ?? 0,
    page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

export async function getJobDetail(
  client: DatabaseClient,
  jobId: string,
): Promise<JobFeedRow | null> {
  const { data, error } = await client
    .from("job_feed")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as JobFeedRow | null) ?? null;
}

const STRENGTH_RANK: Record<PortfolioProjectRow["strength"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Rank portfolio projects by skill overlap, then declared strength. Matching
 * uses whole normalized skill terms plus SKILL_ALIASES synonyms, so
 * "workflow automation" in a job still surfaces an n8n project.
 */
export function rankPortfolioProjects(
  projects: PortfolioProjectRow[],
  skillsRequested: string[],
): Array<{ project: PortfolioProjectRow; matches: SkillMatch[] }> {
  return projects
    .map((project) => ({
      project,
      matches: matchSkills(skillsRequested, project.skills),
      rank: STRENGTH_RANK[project.strength],
    }))
    .filter((entry) => entry.matches.length > 0)
    .sort(
      (a, b) =>
        b.matches.length - a.matches.length ||
        a.rank - b.rank ||
        a.project.title.localeCompare(b.project.title),
    );
}

/** Top matching portfolio projects for a job, for use as proposal evidence. */
export function matchPortfolioProjects(
  projects: PortfolioProjectRow[],
  skillsRequested: string[],
  limit = 3,
): PortfolioProjectRow[] {
  return rankPortfolioProjects(projects, skillsRequested)
    .slice(0, limit)
    .map((entry) => entry.project);
}

export interface DashboardStats {
  jobsAnalyzed: number;
  highFit: number;
  proposalsDrafted: number;
  applicationsLogged: number;
  applyToday: number;
  reviewToday: number;
  skipToday: number;
}

export async function getDashboardStats(
  client: DatabaseClient,
): Promise<DashboardStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = startOfDay.toISOString();

  const [{ count: jobsAnalyzed }, { count: highFit }] = await Promise.all([
    client.from("jobs").select("*", { count: "exact", head: true }),
    client
      .from("job_feed")
      .select("*", { count: "exact", head: true })
      .gte("score_total", 7),
  ]);

  const [{ count: proposalsDrafted }, { count: applicationsLogged }] =
    await Promise.all([
      client.from("proposals").select("*", { count: "exact", head: true }),
      client.from("applications").select("*", { count: "exact", head: true }),
    ]);

  const countToday = async (
    recommendation: Recommendation,
  ): Promise<number> => {
    const { count } = await client
      .from("job_scores")
      .select("*", { count: "exact", head: true })
      .eq("recommendation", recommendation)
      .gte("created_at", today);
    return count ?? 0;
  };

  const [applyToday, reviewToday, skipToday] = await Promise.all([
    countToday("APPLY"),
    countToday("REVIEW"),
    countToday("SKIP"),
  ]);

  return {
    jobsAnalyzed: jobsAnalyzed ?? 0,
    highFit: highFit ?? 0,
    proposalsDrafted: proposalsDrafted ?? 0,
    applicationsLogged: applicationsLogged ?? 0,
    applyToday,
    reviewToday,
    skipToday,
  };
}
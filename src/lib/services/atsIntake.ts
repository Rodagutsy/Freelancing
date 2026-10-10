import { ATS_KEYWORDS } from "@/lib/constants";
import { safeFetchFromUntrustedUrl } from "@/lib/security/ssrf";
import type {
  DatabaseClient,
  JobRow,
  ProfileRow,
  WatchedCompanyRow,
} from "@/lib/types";
import { getProfilesForUser } from "@/lib/services/settings";
import { scoreJobForAllPersonas } from "@/lib/services/scoring";
import {
  remainingScoreBudget,
  weeklyScoreLimit,
} from "@/lib/services/scoringBudget";

/** A job scraped from an ATS board, before it is normalized into `jobs`. */
export interface AtsJob {
  title: string;
  description: string;
  url: string;
  location: string;
  skills: string[];
  posted_at: string;
}

export interface AtsIntakeSummary {
  companiesPolled: number;
  jobsFound: number;
  jobsNew: number;
  jobsScored: number;
  errors: Array<{ company: string; error: string }>;
  capped: boolean;
  /** True when new jobs were imported but left unscored (weekly budget spent). */
  scoresCapped: boolean;
  /** Weekly DeepSeek scoring calls still available at the end of the run. */
  scoreBudgetRemaining: number;
}

function stripHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await safeFetchFromUntrustedUrl(url, {
    timeoutMs: 15_000,
    maxBytes: 5_000_000,
  });
  if (!res.ok) {
    throw new Error(`Board returned HTTP ${res.status}`);
  }
  return JSON.parse(res.body.toString("utf8"));
}

/* ------------------------------------------------------------------ */
/* Per-platform adapters (ported from n8n/workflows/05_ats_intake.json) */
/* ------------------------------------------------------------------ */

async function scrapeGreenhouse(company: WatchedCompanyRow): Promise<AtsJob[]> {
  const slug =
    company.board_token ||
    company.careers_url.match(/boards\.greenhouse\.io\/([\w.-]+)/)?.[1] ||
    "";
  if (!slug) return [];
  const data = (await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
  )) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => ({
    title: asString(j.title),
    description: stripHtml(j.content),
    url: asString(j.absolute_url) || `https://boards.greenhouse.io/${slug}/jobs/${j.id}`,
    location: asString((j.location as { name?: string } | undefined)?.name),
    skills: ((j.departments as Array<{ name?: string }> | undefined) ?? [])
      .map((d) => asString(d.name))
      .filter(Boolean),
    posted_at: asString(j.updated_at) || asString(j.created_at) || new Date().toISOString(),
  }));
}

async function scrapeLever(company: WatchedCompanyRow): Promise<AtsJob[]> {
  let teamSlug = "";
  try {
    teamSlug = new URL(company.careers_url).hostname.replace("jobs.lever.co", "");
  } catch {
    return [];
  }
  if (!teamSlug) return [];
  const data = (await fetchJson(
    `https://api.lever.co/v0/postings/${teamSlug}?mode=json`,
  )) as Array<Record<string, unknown>>;
  return (Array.isArray(data) ? data : []).map((j) => ({
    title: asString(j.text),
    description: stripHtml(j.descriptionPlain ?? j.description),
    url: asString(j.hostedUrl) || company.careers_url,
    location: asString(
      (j.categories as { location?: string } | undefined)?.location,
    ),
    skills: ((j.tags as string[] | undefined) ?? []).filter(Boolean),
    posted_at: j.createdAt ? new Date(j.createdAt as string).toISOString() : new Date().toISOString(),
  }));
}

async function scrapeAshby(company: WatchedCompanyRow): Promise<AtsJob[]> {
  const orgSlug = company.careers_url.match(/ashbyhq\.com\/([\w.-]+)/)?.[1] || "";
  if (!orgSlug) return [];
  const data = (await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${orgSlug}`,
  )) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => ({
    title: asString(j.title),
    description: stripHtml(j.descriptionPlain ?? j.description),
    url: asString(j.url) || company.careers_url,
    location: asString(j.locationName),
    skills: j.teamName ? [asString(j.teamName)] : [],
    posted_at: asString(j.publishedAt) || new Date().toISOString(),
  }));
}

async function scrapeWorkable(company: WatchedCompanyRow): Promise<AtsJob[]> {
  const subdomain = company.careers_url.match(/([\w-]+)\.workable\.com/)?.[1] || "";
  if (!subdomain) return [];
  const data = (await fetchJson(
    `https://${subdomain}.workable.com/spider/v1/api/accounts/${subdomain}/jobs`,
  )) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => ({
    title: asString(j.title),
    description: stripHtml(j.description),
    url: asString(j.url) || company.careers_url,
    location: asString(j.region) || asString(j.city),
    skills: ((j.tags as string[] | undefined) ?? []).filter(Boolean),
    posted_at: asString(j.published_at) || new Date().toISOString(),
  }));
}

async function scrapeSmartRecruiters(company: WatchedCompanyRow): Promise<AtsJob[]> {
  const data = (await fetchJson(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company.name)}/postings?limit=100`,
  )) as { content?: Array<Record<string, unknown>> };
  return (data.content ?? []).map((j) => {
    const jobAd = j.jobAd as { sections?: { generalDescription?: string; employmentExperience?: string } } | undefined;
    const experience = asString(jobAd?.sections?.employmentExperience);
    return {
      title: asString(j.name),
      description: stripHtml(jobAd?.sections?.generalDescription),
      url: asString(j.ref) || asString(j.applyUrl) || company.careers_url,
      location: asString((j.location as { city?: string } | undefined)?.city),
      skills: experience
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      posted_at: asString(j.releasedDate) || new Date().toISOString(),
    };
  });
}

async function scrapeRecruitee(company: WatchedCompanyRow): Promise<AtsJob[]> {
  const token =
    company.board_token || company.name.toLowerCase().replace(/\s+/g, "");
  const data = (await fetchJson(
    `https://api.recruitee.com/v1/careers/${token}/jobs`,
  )) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => ({
    title: asString(j.title),
    description: stripHtml(j.description),
    url: asString(j.url) || company.careers_url,
    location: asString(j.location),
    skills: [],
    posted_at: asString(j.created_at) || new Date().toISOString(),
  }));
}

/** Fetches raw postings for one watched company. Unknown platforms yield []. */
export async function scrapeCompany(company: WatchedCompanyRow): Promise<AtsJob[]> {
  switch (company.platform) {
    case "greenhouse":
      return scrapeGreenhouse(company);
    case "lever":
      return scrapeLever(company);
    case "ashby":
      return scrapeAshby(company);
    case "workable":
      return scrapeWorkable(company);
    case "smartrecruiters":
      return scrapeSmartRecruiters(company);
    case "recruitee":
      return scrapeRecruitee(company);
    // Personio has no public jobs API.
    case "personio":
    default:
      return [];
  }
}

/** Broad 4-pillar keyword gate — identical to the old n8n filter. */
export function matchesKeywords(job: AtsJob): boolean {
  const text = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();
  return ATS_KEYWORDS.some((kw) => text.includes(kw));
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

interface RunOptions {
  maxCompanies?: number;
  companyIds?: string[];
  /** Skip fetching if polled within this many minutes (cron dedup). */
  minAgeMinutes?: number;
  concurrency?: number;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const current = index++;
      if (current >= items.length) return;
      results[current] = await worker(items[current]);
    }
  });
  await Promise.all(runners);
  return results;
}

function isRemote(job: AtsJob): boolean {
  return (
    job.location.toLowerCase().includes("remote") ||
    job.description.toLowerCase().includes("remote")
  );
}

/**
 * Polls active ATS boards, upserts matching jobs, and scores the new ones
 * against every persona that owns the company. Used by both the Vercel cron
 * route (service-role client) and the manual "Run intake now" action (session
 * client — RLS limits it to the caller's own companies).
 */
export async function runAtsIntake(
  client: DatabaseClient,
  options: RunOptions = {},
): Promise<AtsIntakeSummary> {
  const maxCompanies = options.maxCompanies ?? 40;
  const concurrency = options.concurrency ?? 5;
  const minAgeMinutes = options.minAgeMinutes ?? 0;

  let query = client
    .from("watched_companies")
    .select("*")
    .eq("active", true)
    .order("last_polled_at", { ascending: true, nullsFirst: true });

  if (options.companyIds && options.companyIds.length > 0) {
    query = query.in("id", options.companyIds);
  }
  query = query.limit(maxCompanies + 1);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let companies = (data ?? []) as WatchedCompanyRow[];
  const capped = companies.length > maxCompanies;
  companies = companies.slice(0, maxCompanies);

  if (minAgeMinutes > 0) {
    const cutoff = Date.now() - minAgeMinutes * 60 * 1000;
    companies = companies.filter(
      (c) => !c.last_polled_at || new Date(c.last_polled_at).getTime() < cutoff,
    );
  }

  const summary: AtsIntakeSummary = {
    companiesPolled: 0,
    jobsFound: 0,
    jobsNew: 0,
    jobsScored: 0,
    errors: [],
    capped,
    scoresCapped: false,
    scoreBudgetRemaining: 0,
  };

  // Weekly scoring budget (one DeepSeek call per job per persona). Counted per
  // owner BEFORE the concurrent poll so workers can't over-spend the budget.
  const budgetLimit = weeklyScoreLimit();
  const budgetByUser = new Map<string, number>();
  if (budgetLimit > 0) {
    const userIds = Array.from(new Set(companies.map((c) => c.user_id)));
    for (const userId of userIds) {
      budgetByUser.set(userId, await remainingScoreBudget(client, userId));
    }
  }

  const profilesCache = new Map<string, ProfileRow[]>();

  await mapWithConcurrency(companies, concurrency, async (company) => {
    summary.companiesPolled += 1;
    let jobs: AtsJob[] = [];
    let status = "ok";
    let lastError: string | null = null;

    try {
      const scraped = await scrapeCompany(company);
      jobs = scraped.filter((job) => job.url && matchesKeywords(job));
      if (company.platform === "personio" || company.platform === "unknown") {
        status = "unsupported";
      }
    } catch (error) {
      status = "error";
      lastError = error instanceof Error ? error.message : "Scrape failed.";
      summary.errors.push({ company: company.name, error: lastError });
    }

    let newIds: string[] = [];
    if (jobs.length > 0) {
      const rows = jobs.map((job) => ({
        user_id: company.user_id,
        source: "ats_api" as const,
        raw_payload: { ...job, careers_url: company.careers_url },
        title: job.title || "Untitled",
        description: job.description || "",
        skills_requested: job.skills,
        budget_min: null,
        budget_max: null,
        budget_type: "salary" as const,
        client_rating: null,
        client_reviews_count: null,
        client_jobs_posted: null,
        client_hire_rate: null,
        proposals_count: null,
        posted_at: job.posted_at || new Date().toISOString(),
        url: job.url,
        ingested_at: new Date().toISOString(),
        company_name: company.name,
        location: job.location || null,
        is_remote: isRemote(job),
      }));

      const { data: inserted, error: upsertError } = await client
        .from("jobs")
        .upsert(rows, {
          onConflict: "user_id,url",
          ignoreDuplicates: true,
        })
        .select("id");

      if (upsertError) {
        status = "error";
        lastError = upsertError.message;
        summary.errors.push({ company: company.name, error: upsertError.message });
      } else {
        newIds = (inserted ?? []).map((row) => row.id as string);
        summary.jobsNew += newIds.length;
      }
    }

    // Score brand-new jobs against every persona that owns this company,
    // staying within the per-user weekly DeepSeek budget.
    if (newIds.length > 0) {
      let profiles = profilesCache.get(company.user_id);
      if (!profiles) {
        profiles = await getProfilesForUser(client, company.user_id);
        profilesCache.set(company.user_id, profiles);
      }
      if (profiles.length > 0) {
        for (const jobId of newIds) {
          const remaining = budgetByUser.get(company.user_id) ?? 0;
          if (remaining <= 0) {
            summary.scoresCapped = true;
            break;
          }
          // Reserve up front so concurrent companies can't double-spend.
          const personasToScore =
            remaining >= profiles.length ? profiles : profiles.slice(0, remaining);
          budgetByUser.set(company.user_id, remaining - personasToScore.length);
          try {
            const result = await scoreJobForAllPersonas(
              client,
              jobId,
              personasToScore,
            );
            if (result.scores.length > 0) summary.jobsScored += 1;
          } catch {
            // Individual scoring failures shouldn't fail the whole run; refund
            // the reserved budget since no score was produced.
            budgetByUser.set(
              company.user_id,
              (budgetByUser.get(company.user_id) ?? 0) + personasToScore.length,
            );
          }
        }
      }
    }

    summary.jobsFound += jobs.length;

    await client
      .from("watched_companies")
      .update({
        last_polled_at: new Date().toISOString(),
        last_status: status,
        last_jobs_found: jobs.length,
        last_error: lastError,
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id);
  });

  summary.scoreBudgetRemaining = Array.from(budgetByUser.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  return summary;
}

/** Convenience: the jobs table row shape used when normalizing an ATS job. */
export type NormalizedAtsJob = Pick<
  JobRow,
  "source" | "title" | "description" | "url" | "company_name" | "location"
>;

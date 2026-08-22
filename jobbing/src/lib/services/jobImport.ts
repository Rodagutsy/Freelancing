/**
 * Best-effort import of a single Upwork job page. The user supplies the URL
 * explicitly, so this only fetches the one page they asked for (never the job
 * feed, which Upwork terms forbid scraping). Upwork's markup changes over
 * time, so every extraction is defensive and optional — the UI falls back to
 * manual entry when nothing can be read.
 */

export interface JobImportPreview {
  title?: string;
  description?: string;
  skills?: string[];
  budget_type?: "fixed" | "hourly";
  budget_min?: number;
  budget_max?: number;
}

const KEY_PATTERN = /\/jobs\/~([A-Za-z0-9]+)/;
const SLUG_PATTERN = /\/freelance-jobs\/([A-Za-z0-9]+)/;

export function extractUpworkJobKey(url: string): string | null {
  const key = url.match(KEY_PATTERN) ?? url.match(SLUG_PATTERN);
  return key ? key[1] : null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toNum(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Walk the embedded JSON tree collecting every object that looks like a job. */
function collectJobCandidates(
  node: unknown,
  out: Array<Record<string, unknown>>,
  depth = 0,
): void {
  if (depth > 7 || node === null || node === undefined) return;

  if (Array.isArray(node)) {
    for (const item of node) collectJobCandidates(item, out, depth + 1);
    return;
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const title =
      typeof obj.title === "string"
        ? obj.title
        : typeof obj.jobTitle === "string"
          ? obj.jobTitle
          : undefined;
    const description =
      typeof obj.description === "string"
        ? obj.description
        : typeof obj.jobDescription === "string"
          ? obj.jobDescription
          : typeof obj.overview === "string"
            ? obj.overview
            : undefined;

    if (title && description && title.length >= 3 && description.length >= 20) {
      out.push(obj);
    }

    for (const value of Object.values(obj)) {
      collectJobCandidates(value, out, depth + 1);
    }
  }
}

const JOB_KEYS = new Set([
  "title",
  "jobTitle",
  "description",
  "jobDescription",
  "overview",
  "skills",
  "skillsRequested",
  "jobSkills",
  "budget",
  "hourlyBudget",
  "budgetType",
  "budget_type",
  "compensation",
  "rate",
  "rating",
]);

function bestCandidate(
  candidates: Array<Record<string, unknown>>,
): Record<string, unknown> | null {
  let best: Record<string, unknown> | null = null;
  let bestScore = -1;
  for (const candidate of candidates) {
    let score = 0;
    for (const key of Object.keys(candidate)) {
      if (JOB_KEYS.has(key)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function toSkill(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const name =
      typeof obj.name === "string"
        ? obj.name
        : typeof obj.skill === "string"
          ? obj.skill
          : undefined;
    return name ? name.trim() : undefined;
  }
  return undefined;
}

function parseBudget(
  found: Record<string, unknown>,
): Pick<JobImportPreview, "budget_type" | "budget_min" | "budget_max"> {
  const result: Pick<
    JobImportPreview,
    "budget_type" | "budget_min" | "budget_max"
  > = {};

  const budget =
    found.budget ?? found.hourlyBudget ?? found.compensation ?? found.rate;
  let min: number | undefined;
  let max: number | undefined;
  let type: "fixed" | "hourly" | undefined;

  if (budget && typeof budget === "object") {
    const box = budget as Record<string, unknown>;
    min = toNum(box.min ?? box.minimum ?? box.minAmount);
    max = toNum(box.max ?? box.maximum ?? box.maxAmount);
    const rawType =
      typeof box.type === "string" ? box.type.toLowerCase() : undefined;
    if (rawType?.includes("hour")) type = "hourly";
    else if (rawType?.includes("fixed")) type = "fixed";
  } else if (typeof budget === "string") {
    const range = budget.match(/\$?\s*([\d.,]+)\s*[-–]\s*\$?\s*([\d.,]+)/);
    if (range) {
      min = toNum(range[1]);
      max = toNum(range[2]);
    }
  }

  const budgetTypeField =
    typeof found.budget_type === "string"
      ? found.budget_type.toLowerCase()
      : typeof found.budgetType === "string"
        ? found.budgetType.toLowerCase()
        : undefined;
  if (budgetTypeField?.includes("hour")) type = type ?? "hourly";
  else if (budgetTypeField?.includes("fixed")) type = type ?? "fixed";

  if (type) result.budget_type = type;
  if (min !== undefined) result.budget_min = min;
  if (max !== undefined) result.budget_max = max;
  return result;
}

export async function importJobPreview(url: string): Promise<JobImportPreview> {
  const key = extractUpworkJobKey(url);
  if (!key) {
    throw new Error("That doesn't look like an Upwork job link.");
  }

  let response: Response;
  try {
    response = await fetch(`https://www.upwork.com/jobs/~${key}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("Could not reach Upwork. Fill in the details manually.");
  }

  if (!response.ok) {
    throw new Error(`Upwork returned ${response.status} for that page.`);
  }

  const html = await response.text();
  if (!html || html.length < 500) {
    throw new Error("Upwork returned an empty page for that link.");
  }

  const preview: JobImportPreview = {};

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const title = decodeEntities(titleMatch[1])
      .replace(/\s*[|–—-]\s*(Upwork|Freelance Jobs|Hiring).*$/i, "")
      .trim();
    if (title.length >= 3 && title.length <= 300) preview.title = title;
  }

  const descriptionMatch =
    html.match(
      /<meta[^>]+(?:property="og:description"|name="description")[^>]*content="([^"]*)"/i,
    ) ??
    html.match(
      /<meta[^>]+content="([^"]*)"[^>]+(?:property="og:description"|name="description")/i,
    );
  if (descriptionMatch) {
    const description = decodeEntities(descriptionMatch[1]).trim();
    if (description.length >= 20) preview.description = description;
  }

  const nextData = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i,
  );
  if (nextData) {
    try {
      const data = JSON.parse(nextData[1]);
      const candidates: Array<Record<string, unknown>> = [];
      collectJobCandidates(data, candidates);
      const found = bestCandidate(candidates);
      if (found) {
        if (!preview.title && typeof found.title === "string") {
          preview.title = found.title;
        } else if (!preview.title && typeof found.jobTitle === "string") {
          preview.title = found.jobTitle;
        }
        if (!preview.description && typeof found.description === "string") {
          preview.description = found.description;
        }
        const skills = found.skills ?? found.skillsRequested ?? found.jobSkills;
        if (Array.isArray(skills)) {
          const parsed = skills
            .map(toSkill)
            .filter((skill): skill is string => Boolean(skill))
            .slice(0, 20);
          if (parsed.length) preview.skills = parsed;
        }
        Object.assign(preview, parseBudget(found));
      }
    } catch {
      // Embedded JSON is malformed — the meta tags above already gave us what they could.
    }
  }

  if (!preview.title && !preview.description && !preview.skills?.length) {
    throw new Error("Couldn't read the job automatically. Fill in the details below.");
  }

  return preview;
}
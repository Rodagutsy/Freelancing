import type {
  DatabaseClient,
  WatchedCompanyPlatform,
  WatchedCompanyRow,
} from "@/lib/types";
import { assertSafeUrl } from "@/lib/schemas/audit";

/** Supported ATS platforms and their URL patterns for detection. */
const ATS_PATTERNS: Array<{
  platform: WatchedCompanyPlatform;
  pattern: RegExp;
}> = [
  { platform: "greenhouse", pattern: /boards\.greenhouse\.io/i },
  { platform: "lever", pattern: /jobs\.lever\.co/i },
  { platform: "ashby", pattern: /jobs\.ashbyhq\.com/i },
  { platform: "workable", pattern: /\.workable\.com/i },
  { platform: "smartrecruiters", pattern: /career\.smartrecruiters\.com/i },
  { platform: "personio", pattern: /personio\.de|jobs\.personio\./i },
  { platform: "recruitee", pattern: /recruitee\.com|\.recruitee\./i },
];

export interface DetectAtsResult {
  platform: WatchedCompanyPlatform;
  careersUrl: string;
  verified: boolean;
}

/**
 * Given a careers URL, sniffs which ATS platform it uses and
 * verifies the endpoint is live (returns HTTP 200-ish).
 */
export async function detectAts(url: string): Promise<DetectAtsResult> {
  if (!assertSafeUrl(url)) {
    throw new Error("This URL is not publicly accessible.");
  }
  const parsed = new URL(url);
  const origin = parsed.origin + parsed.pathname;

  let platform: WatchedCompanyPlatform = "unknown";
  for (const { platform: p, pattern } of ATS_PATTERNS) {
    if (pattern.test(origin)) {
      platform = p;
      break;
    }
  }

  let verified = false;
  try {
    const resp = await fetch(origin, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    verified = resp.ok;
  } catch {
    verified = false;
  }

  return { platform, careersUrl: origin, verified };
}

export async function listWatchedCompanies(
  client: DatabaseClient,
): Promise<WatchedCompanyRow[]> {
  const { data, error } = await client
    .from("watched_companies")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as WatchedCompanyRow[];
}

export async function addWatchedCompany(
  client: DatabaseClient,
  input: { name: string; careersUrl: string; region?: "us" | "eu" },
): Promise<WatchedCompanyRow> {
  const detected = await detectAts(input.careersUrl);

  const { data, error } = await client
    .from("watched_companies")
    .insert({
      name: input.name.trim(),
      platform: detected.platform,
      careers_url: detected.careersUrl,
      region: input.region ?? "us",
      active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as WatchedCompanyRow;
}

export async function toggleWatchedCompany(
  client: DatabaseClient,
  companyId: string,
  active: boolean,
): Promise<void> {
  const { error } = await client
    .from("watched_companies")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", companyId);

  if (error) throw new Error(error.message);
}

export async function deleteWatchedCompany(
  client: DatabaseClient,
  companyId: string,
): Promise<void> {
  const { error } = await client
    .from("watched_companies")
    .delete()
    .eq("id", companyId);

  if (error) throw new Error(error.message);
}

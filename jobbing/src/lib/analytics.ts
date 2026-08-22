import type { ApplicationWithJob } from "@/lib/services/applications";
import type { ProposalRow } from "@/lib/types";

export interface BandStat {
  label: string;
  total: number;
  interviews: number;
  rate: number | null;
}

const SCORE_BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: "0–5.9", min: 0, max: 5.9 },
  { label: "6–6.9", min: 6, max: 6.9 },
  { label: "7–7.9", min: 7, max: 7.9 },
  { label: "8–8.9", min: 8, max: 8.9 },
  { label: "9–10", min: 9, max: 10 },
];

const BUDGET_BANDS: Array<{ label: string; min: number | null; max: number | null }> = [
  { label: "Under $500", min: 0, max: 499 },
  { label: "$500–$999", min: 500, max: 999 },
  { label: "$1,000–$2,499", min: 1000, max: 2499 },
  { label: "$2,500+", min: 2500, max: null },
  { label: "Unknown", min: null, max: null },
];

function isInterview(outcome: string): boolean {
  return outcome === "interview" || outcome === "hired";
}

function rate(total: number, interviews: number): number | null {
  return total > 0 ? interviews / total : null;
}

export function interviewRateByScoreBand(
  apps: ApplicationWithJob[],
): BandStat[] {
  return SCORE_BANDS.map((band) => {
    const subset = apps.filter(
      (a) =>
        a.score_at_apply >= band.min && a.score_at_apply <= band.max,
    );
    const interviews = subset.filter((a) => isInterview(a.outcome)).length;
    return {
      label: band.label,
      total: subset.length,
      interviews,
      rate: rate(subset.length, interviews),
    };
  });
}

function budgetForApp(app: ApplicationWithJob): number | null {
  const max = app.job?.budget_max ?? null;
  return max;
}

export function interviewRateByBudget(
  apps: ApplicationWithJob[],
): BandStat[] {
  return BUDGET_BANDS.map((band) => {
    const subset = apps.filter((a) => {
      const budget = budgetForApp(a);
      if (band.min === null && band.max === null) return budget === null;
      if (budget === null) return false;
      if (band.min !== null && budget < band.min) return false;
      if (band.max !== null && budget > band.max) return false;
      return true;
    });
    const interviews = subset.filter((a) => isInterview(a.outcome)).length;
    return {
      label: band.label,
      total: subset.length,
      interviews,
      rate: rate(subset.length, interviews),
    };
  });
}

export interface AngleStat {
  angle: string;
  total: number;
  interviews: number;
  rate: number | null;
}

export function proposalAngleStats(
  apps: ApplicationWithJob[],
  proposals: ProposalRow[],
): AngleStat[] {
  const proposalMap = new Map(proposals.map((p) => [p.id, p]));

  const withAngle = apps
    .map((a) => ({ app: a, proposal: a.proposal_id ? proposalMap.get(a.proposal_id) : undefined }))
    .filter((x) => x.proposal && x.proposal.angle);

  const byAngle = new Map<string, { total: number; interviews: number }>();
  for (const { app, proposal } of withAngle) {
    const angle = proposal!.angle;
    const entry = byAngle.get(angle) ?? { total: 0, interviews: 0 };
    entry.total += 1;
    if (isInterview(app.outcome)) entry.interviews += 1;
    byAngle.set(angle, entry);
  }

  return Array.from(byAngle.entries())
    .map(([angle, stat]) => ({
      angle,
      total: stat.total,
      interviews: stat.interviews,
      rate: rate(stat.total, stat.interviews),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}
import type {
  AuditIssueRow,
  AuditOpportunityRow,
  AuditPageRow,
  AuditRow,
  AuditTechnologyRow,
  DatabaseClient,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Read-side aggregation for audit detail page                         */
/* ------------------------------------------------------------------ */

export interface AuditSummary {
  audit: AuditRow;
  pages: AuditPageRow[];
  technologies: AuditTechnologyRow[];
  issues: AuditIssueRow[];
  opportunities: AuditOpportunityRow[];
  issuesByCategory: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  oppsByCategory: Record<string, number>;
  topOpportunities: AuditOpportunityRow[];
}

export async function getAuditSummary(
  client: DatabaseClient,
  auditId: string,
): Promise<AuditSummary | null> {
  const [audit, pages, technologies, issues, opportunities] = await Promise.all([
    client.from("audits").select("*").eq("id", auditId).maybeSingle(),
    client.from("audit_pages").select("*").eq("audit_id", auditId).order("path"),
    client.from("audit_technologies").select("*").eq("audit_id", auditId).order("confidence", { ascending: false }),
    client.from("audit_issues").select("*").eq("audit_id", auditId).order("severity"),
    client.from("audit_opportunities").select("*").eq("audit_id", auditId).order("score", { ascending: false, nullsFirst: false }),
  ]);

  if (audit.error) throw new Error(audit.error.message);
  if (!audit.data) return null;

  const issuesByCategory: Record<string, number> = {};
  const issuesBySeverity: Record<string, number> = {};
  for (const issue of (issues.data ?? []) as AuditIssueRow[]) {
    issuesByCategory[issue.category] = (issuesByCategory[issue.category] ?? 0) + 1;
    issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] ?? 0) + 1;
  }

  const oppsByCategory: Record<string, number> = {};
  for (const opp of (opportunities.data ?? []) as AuditOpportunityRow[]) {
    oppsByCategory[opp.category] = (oppsByCategory[opp.category] ?? 0) + 1;
  }

  const topOpportunities = (opportunities.data ?? [])
    .filter((o: AuditOpportunityRow) => o.score != null && o.score >= 70)
    .slice(0, 5) as AuditOpportunityRow[];

  return {
    audit: audit.data as AuditRow,
    pages: (pages.data ?? []) as AuditPageRow[],
    technologies: (technologies.data ?? []) as AuditTechnologyRow[],
    issues: (issues.data ?? []) as AuditIssueRow[],
    opportunities: (opportunities.data ?? []) as AuditOpportunityRow[],
    issuesByCategory,
    issuesBySeverity,
    oppsByCategory,
    topOpportunities,
  };
}

/* ------------------------------------------------------------------ */
/* Score computation helpers                                           */
/* ------------------------------------------------------------------ */

export interface ScoreBreakdown {
  ui: number;
  ux: number;
  performance: number;
  accessibility: number;
  seo: number;
  conversion: number;
  automation: number;
  overall: number;
}

export function computeScoreBreakdown(
  pages: AuditPageRow[],
  issues: AuditIssueRow[],
  opps: AuditOpportunityRow[],
): ScoreBreakdown {
  // Average Lighthouse scores across pages
  const lighthousePages = pages.filter((p) => p.lighthouse_score != null);
  const avgLighthouse =
    lighthousePages.length > 0
      ? lighthousePages.reduce((s, p) => s + (p.lighthouse_score ?? 0), 0) / lighthousePages.length
      : 70;

  const avgSeo =
    lighthousePages.length > 0
      ? lighthousePages.reduce((s, p) => s + (p.seo_score ?? 70), 0) / lighthousePages.length
      : 70;

  const totalAxeViolations = pages.reduce((s, p) => s + p.axe_violations_count, 0);
  const accessibility = Math.max(0, 100 - totalAxeViolations * 5);

  // Issues by category
  const issueCounts: Record<string, number> = {};
  for (const issue of issues) {
    issueCounts[issue.category] = (issueCounts[issue.category] ?? 0) + 1;
  }

  const ui = Math.max(0, 100 - (issueCounts["ui"] ?? 0) * 8);
  const ux = Math.max(0, 100 - (issueCounts["ux"] ?? 0) * 8);
  const performance = Math.round(avgLighthouse);
  const conversion = Math.max(0, 100 - (issueCounts["conversion"] ?? 0) * 10);

  // Automation score based on opportunities
  const highOpps = opps.filter((o) => o.business_impact === "high").length;
  const medOpps = opps.filter((o) => o.business_impact === "medium").length;
  const automation = Math.min(100, 30 + highOpps * 15 + medOpps * 5);

  const overall = Math.round(
    ui * 0.15 +
      ux * 0.15 +
      performance * 0.2 +
      accessibility * 0.1 +
      avgSeo * 0.15 +
      conversion * 0.15 +
      automation * 0.1,
  );

  return {
    ui: Math.round(ui),
    ux: Math.round(ux),
    performance: Math.round(performance),
    accessibility: Math.round(accessibility),
    seo: Math.round(avgSeo),
    conversion: Math.round(conversion),
    automation: Math.min(100, automation),
    overall: Math.min(100, overall),
  };
}

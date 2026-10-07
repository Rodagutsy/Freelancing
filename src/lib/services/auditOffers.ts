import type {
  AuditIssueRow,
  AuditOpportunityRow,
  AuditRow,
  DatabaseClient,
  PortfolioProjectRow,
  ProfileRow,
} from "@/lib/types";
import {
  getAudit,
  getAuditIssues,
  getAuditOpportunities,
} from "@/lib/services/audits";
import { getDefaultProfile } from "@/lib/services/settings";
import { listPortfolioProjects } from "@/lib/services/portfolio";
import { skillsMatch } from "@/lib/skillMatch";

export interface AuditProjectOffer {
  project: PortfolioProjectRow;
  matchedSkills: string[];
}

export interface AuditOpportunityOffer {
  opportunity: AuditOpportunityRow;
  matchedServices: string[];
  matchedProjects: AuditProjectOffer[];
  hasFit: boolean;
}

export interface BusinessNeed {
  kind: "opportunity" | "issue";
  title: string;
  summary: string;
  marker: string;
  score: number | null;
}

export interface AuditOfferContext {
  audit: AuditRow;
  profile: ProfileRow | null;
  issues: AuditIssueRow[];
  offers: AuditOpportunityOffer[];
  needs: BusinessNeed[];
}

const STRENGTH_RANK: Record<PortfolioProjectRow["strength"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const MAX_PROJECTS_PER_OPP = 3;
const MAX_SKILLS_PER_PROJECT = 4;

function norm(value: string): string {
  return value.toLowerCase().trim();
}

function opportunityText(opportunity: AuditOpportunityRow): string {
  return [
    opportunity.title,
    opportunity.observed_signal,
    opportunity.inference ?? "",
    opportunity.recommended_workflow ?? "",
    opportunity.recommended_tools.join(", "),
  ].join(" ");
}

/** True when the opportunity text mentions the skill by name or a synonym. */
function textMatchesSkill(text: string, skill: string): boolean {
  const haystack = norm(text);
  if (haystack.includes(norm(skill))) return true;

  const tokens = haystack.split(/[^a-z0-9+#.]+/).filter(Boolean);
  return tokens.some(
    (token) => skillsMatch(token, skill) || skillsMatch(skill, token),
  );
}

/**
 * Matches one audit opportunity against the freelancer's service list and
 * portfolio project skills. Everything is derived read-side from the profile
 * and portfolio, so no extra AI cost and no pipeline changes.
 */
export function matchOpportunityToSkills(
  opportunity: AuditOpportunityRow,
  profile: ProfileRow | null,
  projects: PortfolioProjectRow[],
): Pick<AuditOpportunityOffer, "matchedServices" | "matchedProjects" | "hasFit"> {
  const text = opportunityText(opportunity);

  const matchedServices = (profile?.services ?? []).filter((service) =>
    textMatchesSkill(text, service),
  );

  const matchedProjects = projects
    .map((project) => ({
      project,
      matchedSkills: project.skills
        .filter((skill) => textMatchesSkill(text, skill))
        .slice(0, MAX_SKILLS_PER_PROJECT),
    }))
    .filter((entry) => entry.matchedSkills.length > 0)
    .sort(
      (a, b) =>
        b.matchedSkills.length - a.matchedSkills.length ||
        STRENGTH_RANK[a.project.strength] - STRENGTH_RANK[b.project.strength],
    )
    .slice(0, MAX_PROJECTS_PER_OPP);

  return {
    matchedServices,
    matchedProjects,
    hasFit: matchedServices.length > 0 || matchedProjects.length > 0,
  };
}

/** Synthesized "what this business needs" list: top opportunities, then fixes. */
export function synthesizeBusinessNeeds(
  offers: AuditOpportunityOffer[],
  issues: AuditIssueRow[],
): BusinessNeed[] {
  const oppNeeds = offers
    .map(({ opportunity }) => opportunity)
    .filter((opp) => opp.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 4)
    .map((opp) => ({
      kind: "opportunity" as const,
      title: opp.title,
      summary: opp.inference ?? opp.observed_signal,
      marker: `${String(opp.business_impact).toUpperCase()} IMPACT`,
      score: opp.score,
    }));

  const severityOrder: Record<string, number> = { critical: 0, high: 1 };
  const issueNeeds = issues
    .filter((issue) => issue.severity === "critical" || issue.severity === "high")
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 4)
    .map((issue) => ({
      kind: "issue" as const,
      title: issue.title,
      summary: issue.description,
      marker: issue.severity.toUpperCase(),
      score: null,
    }));

  return [...oppNeeds, ...issueNeeds];
}

/**
 * Everything the audit detail page and pitch packet need to go from "what the
 * business needs" to "what I can offer them": the audit, the freelancer's fit
 * per opportunity, and a synthesized needs list.
 */
export async function getAuditOfferContext(
  client: DatabaseClient,
  auditId: string,
): Promise<AuditOfferContext> {
  const [audit, issues, opportunities, profile, projects] = await Promise.all([
    getAudit(client, auditId),
    getAuditIssues(client, auditId),
    getAuditOpportunities(client, auditId),
    getDefaultProfile(client),
    listPortfolioProjects(client),
  ]);

  if (!audit) throw new Error("Audit not found.");

  const offers = opportunities.map((opportunity) => ({
    opportunity,
    ...matchOpportunityToSkills(opportunity, profile, projects),
  }));

  return {
    audit,
    profile,
    issues,
    offers,
    needs: synthesizeBusinessNeeds(offers, issues),
  };
}
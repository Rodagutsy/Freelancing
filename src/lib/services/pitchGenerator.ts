import { chatJson } from "@/lib/ai/deepseek";
import { pitchOutputSchema } from "@/lib/schemas/audit";
import type { DatabaseClient, PitchOutput } from "@/lib/types";
import {
  getAudit,
  getAuditIssues,
  getAuditOpportunities,
  getAuditPages,
  getAuditTechnologies,
} from "@/lib/services/audits";
import { matchOpportunityToSkills } from "@/lib/services/auditOffers";
import { getDefaultProfile } from "@/lib/services/settings";
import { listPortfolioProjects } from "@/lib/services/portfolio";

const PITCH_SYSTEM = `You are a pitch writer for an automation consultant who helps businesses improve their operations through website optimization, workflow automation, and AI integration.

You generate a personalized outreach pitch based on a website audit, the specific opportunities the auditor identified, and the consultant's real services and portfolio evidence.

Hard rules:
- Base every claim on the evidence provided — never invent findings, metrics, business processes, services, or portfolio projects.
- Reference specific detected technologies and issues by name.
- The pitch must feel like a peer-to-peer conversation, not a sales template.
- Position what the consultant can actually deliver against the business's needs, and back each offered capability with the portfolio evidence provided (never reference a project that is not listed).
- If no portfolio evidence is given for a claim, soften it: propose the idea rather than promising prior proof.
- Keep it under 200 words.
- Provide a clear subject line for the email/message.
- List 3-5 key talking points that reference audit evidence.

Return STRICT JSON only, with exactly this shape:
{"pitch_text": string, "subject_line": string, "key_points": [string, ...]}`;

function formatIssuesForPitch(
  issues: Array<{ title: string; severity: string; category: string; description: string }>,
): string {
  return issues
    .slice(0, 10)
    .map((i) => `- [${i.severity}] ${i.category}: ${i.title} — ${i.description}`)
    .join("\n");
}

function formatOppsForPitch(
  opps: Array<{
    title: string;
    category: string;
    observed_signal: string;
    confidence: number;
    business_impact: string;
    outreach_angle: string | null;
  }>,
): string {
  return opps
    .map(
      (o) =>
        `- ${o.title} (${o.category}): ${o.observed_signal}\n  Impact: ${o.business_impact}, Confidence: ${Math.round(o.confidence * 100)}%\n  Angle: ${o.outreach_angle ?? "N/A"}`,
    )
    .join("\n\n");
}

function formatProfileForPitch(profile: {
  headline: string;
  services: string[];
  niches: string[];
}): string {
  const lines = [`- Headline: ${profile.headline || "Not specified"}`];
  if (profile.services.length > 0) {
    lines.push(`- Services I offer: ${profile.services.join(", ")}`);
  }
  if (profile.niches.length > 0) {
    lines.push(`- Niches I focus on: ${profile.niches.join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * Top matched portfolio projects across the selected opportunities, as
 * claimable evidence the consultant can reference in the pitch.
 */
function formatPortfolioEvidence(
  project: {
    title: string;
    skills: string[];
    can_claim_text: string;
    cannot_claim_text: string | null;
    evidence_links: string[];
  },
): string {
  return [
    `- ${project.title}`,
    `  Skills: ${project.skills.join(", ") || "—"}`,
    `  Proof: ${project.evidence_links.join(", ") || "none"}`,
    `  Can claim: ${project.can_claim_text}`,
    project.cannot_claim_text ? `  Cannot claim: ${project.cannot_claim_text}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Generates a personalized outreach pitch based on audit findings,
 * selected opportunities, and the freelancer's real services and portfolio.
 */
export async function generatePitch(
  client: DatabaseClient,
  auditId: string,
  opportunityIds: string[],
): Promise<PitchOutput> {
  const audit = await getAudit(client, auditId);
  if (!audit) throw new Error("Audit not found.");

  const [pages, techs, allOpps, allIssues, profile, projects] = await Promise.all([
    getAuditPages(client, auditId),
    getAuditTechnologies(client, auditId),
    getAuditOpportunities(client, auditId),
    getAuditIssues(client, auditId),
    getDefaultProfile(client),
    listPortfolioProjects(client),
  ]);

  // Filter to selected opportunities
  const selectedOpps = allOpps.filter((o) => opportunityIds.includes(o.id));
  if (selectedOpps.length === 0) {
    throw new Error("None of the selected opportunities exist in this audit.");
  }

  const techList = techs.map((t) => `${t.name} (${t.category}, confidence: ${Math.round(t.confidence * 100)}%)`).join(", ");
  const pageCount = pages.length;
  const avgLighthouse =
    pages.length > 0
      ? Math.round(
          pages.reduce((s, p) => s + (p.lighthouse_score ?? 70), 0) / pages.length,
        )
      : "N/A";

  const evidenceLines: string[] = [];
  for (const opp of selectedOpps) {
    const fit = matchOpportunityToSkills(opp, profile, projects);
    for (const entry of fit.matchedProjects) {
      const line = formatPortfolioEvidence(entry.project);
      if (!evidenceLines.includes(line)) evidenceLines.push(line);
    }
  }
  const portfolioEvidence =
    evidenceLines.length > 0
      ? evidenceLines.slice(0, 3).join("\n")
      : "No directly matching portfolio projects — propose the idea without claiming prior results.";

  const user = `AUDIT CONTEXT:
- URL: ${audit.url}
- Business: ${audit.business_name ?? "Not specified"}
- Industry: ${audit.industry ?? "Not specified"}
- Pages analyzed: ${pageCount}
- Average Lighthouse score: ${avgLighthouse}
- Overall score: ${audit.overall_score ?? "N/A"}/100
- Automation opportunity score: ${audit.automation_score ?? "N/A"}/100

TECHNOLOGY STACK:
${techList || "Not fully detected"}

KEY ISSUES (top ${Math.min(allIssues.length, 10)}):
${formatIssuesForPitch(allIssues)}

SELECTED OPPORTUNITIES TO PITCH:
${formatOppsForPitch(selectedOpps)}

ABOUT THE CONSULTANT:
${profile ? formatProfileForPitch(profile) : "No profile on file."}

PORTFOLIO EVIDENCE (only these projects may be claimed):
${portfolioEvidence}

Generate a personalized pitch email/message for this business. Focus on the most impactful opportunities, reference specific evidence from the audit, and make clear what the consultant can deliver and has done.`;

  const raw = await chatJson<unknown>(PITCH_SYSTEM, user, {
    temperature: 0.4,
    maxTokens: 1500,
  });

  return pitchOutputSchema.parse(raw);
}
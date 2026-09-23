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

const PITCH_SYSTEM = `You are a pitch writer for an automation consultant who helps businesses improve their operations through website optimization, workflow automation, and AI integration.

You generate a personalized outreach pitch based on a website audit and specific opportunities the auditor identified.

Hard rules:
- Base every claim on the evidence provided — never invent findings, metrics, or business processes.
- Reference specific detected technologies and issues by name.
- The pitch must feel like a peer-to-peer conversation, not a sales template.
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

/**
 * Generates a personalized outreach pitch based on audit findings
 * and selected opportunities.
 */
export async function generatePitch(
  client: DatabaseClient,
  auditId: string,
  opportunityIds: string[],
): Promise<PitchOutput> {
  const audit = await getAudit(client, auditId);
  if (!audit) throw new Error("Audit not found.");

  const [pages, techs, allOpps, allIssues] = await Promise.all([
    getAuditPages(client, auditId),
    getAuditTechnologies(client, auditId),
    getAuditOpportunities(client, auditId),
    getAuditIssues(client, auditId),
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

Generate a personalized pitch email/message for this business. Focus on the most impactful opportunities and reference specific evidence from the audit.`;

  const raw = await chatJson<unknown>(PITCH_SYSTEM, user, {
    temperature: 0.4,
    maxTokens: 1500,
  });

  return pitchOutputSchema.parse(raw);
}

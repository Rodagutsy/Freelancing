import { chatJson } from "@/lib/ai/deepseek";
import { buildOutboundDraftMessages } from "@/lib/ai/prompts";
import { outboundDraftOutputSchema } from "@/lib/schemas/outreach";
import type {
  AuditRow,
  DatabaseClient,
  OutboundRow,
  OutboundStep,
  ProspectRow,
} from "@/lib/types";
import {
  getAudit,
  getAuditIssues,
  getAuditOpportunities,
  getAuditPages,
  getAuditTechnologies,
} from "@/lib/services/audits";
import { getProspect } from "@/lib/services/prospects";
import {
  getEmailSequence,
  getEmailSequenceByName,
  listEmailSequences,
} from "@/lib/services/outreach";

const DEFAULT_TEMPLATE_NAME = "Default (Observation → Breakup)";
const MAX_OPP_SOURCES = 3;

export interface OutboundDraftResult {
  steps: OutboundStep[];
  personalizationAngle: string | null;
  source: "ai" | "template";
  auditId: string | null;
}

export interface GenerateOutboundDraftInput {
  prospectId: string;
  auditIds?: string[];
  primaryAuditId?: string | null;
  emailSequenceId?: string | null;
  instruction?: string;
}

function formatIssues(
  issues: Array<{ title: string; severity: string; category: string; description: string }>,
): string {
  return issues
    .slice(0, 10)
    .map((i) => `- [${i.severity}] ${i.category}: ${i.title} — ${i.description}`)
    .join("\n");
}

function formatOpps(
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

/** Prefer the explicitly-marked primary audit, then the first completed one. */
async function resolveAudit(
  client: DatabaseClient,
  input: GenerateOutboundDraftInput,
): Promise<AuditRow | null> {
  const ordered: string[] = [];
  if (input.primaryAuditId) ordered.push(input.primaryAuditId);
  for (const id of input.auditIds ?? []) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  if (ordered.length === 0) return null;

  for (const id of ordered) {
    const audit = await getAudit(client, id);
    if (audit && audit.status === "completed") return audit;
  }
  return null;
}

async function draftFromAudit(
  client: DatabaseClient,
  prospect: ProspectRow,
  audit: AuditRow,
  instruction?: string,
): Promise<OutboundDraftResult | null> {
  const [pages, techs, allOpps, allIssues] = await Promise.all([
    getAuditPages(client, audit.id),
    getAuditTechnologies(client, audit.id),
    getAuditOpportunities(client, audit.id),
    getAuditIssues(client, audit.id),
  ]);

  const opps = [...allOpps]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MAX_OPP_SOURCES);

  if (opps.length === 0) return null;

  const techList = techs
    .map((t) => `${t.name} (${t.category}, confidence: ${Math.round(t.confidence * 100)}%)`)
    .join(", ");

  const avgLighthouse =
    pages.length > 0
      ? Math.round(pages.reduce((s, p) => s + (p.lighthouse_score ?? 70), 0) / pages.length)
      : "N/A";

  const auditLines = [
    `- URL: ${audit.url}`,
    `- Business: ${audit.business_name ?? "Not specified"}`,
    `- Industry: ${audit.industry ?? "Not specified"}`,
    `- Location: ${audit.location ?? "Not specified"}`,
    `- Pages analyzed: ${pages.length}`,
    `- Average Lighthouse score: ${avgLighthouse}`,
    `- Overall score: ${audit.overall_score ?? "N/A"}/100`,
    `- Automation opportunity score: ${audit.automation_score ?? "N/A"}/100`,
  ].join("\n");

  const { system, user } = buildOutboundDraftMessages({
    prospect: {
      company_name: prospect.company_name,
      contact_name: prospect.contact_name,
      industry: prospect.industry,
      location: prospect.location,
    },
    auditContext: auditLines,
    technologies: techList || "Not fully detected",
    issues: formatIssues(allIssues) || "No issues on file",
    opportunities: formatOpps(opps),
    instruction,
  });

  const raw = await chatJson<unknown>(system, user, {
    temperature: 0.6,
    maxTokens: 3000,
  });

  const output = outboundDraftOutputSchema.parse(raw);
  return {
    steps: output.steps,
    personalizationAngle: output.personalization_angle,
    source: "ai",
    auditId: audit.id,
  };
}

async function draftFromTemplate(
  client: DatabaseClient,
  sequenceId?: string | null,
): Promise<OutboundDraftResult> {
  let seq = sequenceId ? await getEmailSequence(client, sequenceId) : null;
  if (!seq) seq = await getEmailSequenceByName(client, DEFAULT_TEMPLATE_NAME);
  if (!seq) {
    const all = await listEmailSequences(client);
    seq = all[0] ?? null;
  }
  if (!seq) {
    throw new Error(
      "No email sequence template found. Run the 15_seed_email_sequences.sql migration (or create a sequence) first.",
    );
  }
  return {
    steps: seq.steps,
    personalizationAngle: null,
    source: "template",
    auditId: null,
  };
}

/**
 * Creates an outbound draft for a prospect.
 * Uses AI evidence from the primary/completed audit when available,
 * and falls back to the default email sequence template otherwise.
 */
export async function generateOutboundDraft(
  client: DatabaseClient,
  input: GenerateOutboundDraftInput,
): Promise<OutboundDraftResult> {
  if (input.emailSequenceId) {
    const seq = await getEmailSequence(client, input.emailSequenceId);
    if (!seq) throw new Error("Email sequence not found.");
    return draftFromTemplate(client, seq.id);
  }

  const prospect = await getProspect(client, input.prospectId);
  if (!prospect) throw new Error("Prospect not found.");

  const audit = await resolveAudit(client, input);
  if (audit) {
    const ai = await draftFromAudit(client, prospect, audit, input.instruction);
    if (ai) return ai;
  }

  return draftFromTemplate(client, null);
}

/**
 * Regenerates the steps of an existing outbound using a free-text
 * instruction, preserving the evidence-based rules of the original prompt.
 */
export async function reviseOutboundDraft(
  client: DatabaseClient,
  outbound: OutboundRow,
  instruction: string,
): Promise<{ steps: OutboundStep[]; personalizationAngle: string | null }> {
  if (!outbound.steps || outbound.steps.length === 0) {
    throw new Error("This outbound has no steps to revise yet.");
  }

  const prospect = await getProspect(client, outbound.prospect_id);
  if (!prospect) throw new Error("Prospect not found.");

  const { system, user } = buildOutboundDraftMessages({
    prospect: {
      company_name: prospect.company_name,
      contact_name: prospect.contact_name,
      industry: prospect.industry,
      location: prospect.location,
    },
    auditContext: null,
    technologies: "",
    issues: "",
    opportunities: "",
    existingSteps: outbound.steps,
    instruction,
  });

  const raw = await chatJson<unknown>(system, user, {
    temperature: 0.5,
    maxTokens: 3000,
  });

  const output = outboundDraftOutputSchema.parse(raw);
  return {
    steps: output.steps,
    personalizationAngle: output.personalization_angle,
  };
}
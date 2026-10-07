import type { ApplicationOutcome, OutboundStatus, Recommendation, ReplyClassification, SuppressionReason } from "@/lib/types/database";
import type { PersonaPillar } from "@/lib/types";

export const PILLAR_META: Record<PersonaPillar, { label: string; tone: "info" | "success" | "warning" | "muted" }> = {
  design: { label: "Design", tone: "info" },
  build: { label: "Build", tone: "success" },
  automation: { label: "Automation", tone: "warning" },
  growth: { label: "Growth", tone: "muted" },
};

/** Broad keyword net for the ATS radar intake — any match keeps the job. */
export const ATS_KEYWORDS: ReadonlyArray<string> = [
  // design
  "design", "ux", "ui ", "figma", "product designer", "web design",
  // build
  "developer", "engineer", "full-stack", "fullstack", "frontend", "front-end",
  "backend", "back-end", "ai", "llm", "gpt", "machine learning",
  // automation
  "automation", "workflow", "integration", "n8n", "zapier", "make.com",
  "api", "crm",
  // growth
  "growth", "marketing", "seo", "ads", "paid media", "lifecycle",
  "email marketing", "performance marketing",
];

export const SCORE_FACTORS: ReadonlyArray<{
  key: string;
  label: string;
  weight: number;
}> = [
  { key: "portfolio_match", label: "Portfolio match", weight: 0.25 },
  { key: "skill_match", label: "Skill match", weight: 0.2 },
  { key: "experience", label: "Relevant experience", weight: 0.15 },
  { key: "client_quality", label: "Client quality", weight: 0.1 },
  { key: "budget_fit", label: "Budget / rate fit", weight: 0.1 },
  { key: "requirements_fit", label: "Requirements fit", weight: 0.1 },
  { key: "competition", label: "Competition", weight: 0.05 },
  { key: "red_flags", label: "Red flags", weight: 0.05 },
] as const;

export const RECOMMENDATION_META: Record<
  Recommendation,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  APPLY: { label: "APPLY", tone: "success" },
  REVIEW: { label: "REVIEW", tone: "warning" },
  SKIP: { label: "SKIP", tone: "danger" },
};

export const OUTCOME_META: Record<
  ApplicationOutcome,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  unknown: { label: "Not applied", tone: "muted" },
  viewed: { label: "Viewed", tone: "info" },
  interview: { label: "Interview", tone: "warning" },
  hired: { label: "Hired", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

/**
 * Skill synonyms used for evidence matching and given to the scoring AI so it
 * can credit partial overlaps ("n8n" vs "workflow automation"). Keys are
 * lower-cased and matched on word boundaries — never substring-matched, so
 * "ai" does not match "email".
 */
export const SKILL_ALIASES: Readonly<Record<string, readonly string[]>> = {
  n8n: ["workflow automation", "automation workflow", "node automation", "self-hosted automation"],
  zapier: ["workflow automation", "no-code automation", "app automation"],
  "make.com": ["workflow automation", "no-code automation", "app automation"],
  airtable: ["no-code database", "relational database"],
  supabase: ["postgres", "postgresql", "backend database"],
  postgres: ["supabase", "relational database"],
  react: ["frontend", "front-end", "react.js"],
  nextjs: ["next.js", "react", "ssr"],
  typescript: ["javascript", "js", "ts"],
  javascript: ["typescript", "js"],
  node: ["node.js", "nodejs", "backend", "api"],
  python: ["data processing", "automation scripting"],
  api: ["rest api", "webhooks", "web service", "integration"],
  webhook: ["webhooks", "api", "callback"],
  integration: ["api", "webhooks", "automation", "zapier"],
  automation: ["workflow automation", "n8n", "process automation", "integration"],
  crm: ["gohighlevel", "hubspot", "salesforce", "customer management"],
  gohighlevel: ["crm", "go high level", "ghl"],
  llm: ["ai", "large language model", "gpt", "chatgpt"],
  ai: ["llm", "gpt", "machine learning", "artificial intelligence"],
  "machine learning": ["ai", "data science", "llm"],
  "power bi": ["data visualization", "business intelligence", "dashboard"],
  tableau: ["data visualization", "business intelligence", "dashboard"],
  excel: ["spreadsheets", "data analysis", "google sheets"],
  "google sheets": ["excel", "spreadsheets", "airtable"],
  wordpress: ["elementor", "woocommerce", "cms"],
  shopify: ["ecommerce", "woocommerce", "storefront"],
  figma: ["ui design", "ux design", "design system"],
  "ui/ux": ["ui design", "ux design", "figma", "web design"],
  webflow: ["no-code website", "cms", "landing pages"],
};

/** Upper bound on how many matched skill names are echoed back to the AI. */
export const MAX_MATCHED_SKILLS_IN_PROMPT = 12;

export const PROPOSAL_INSTRUCTIONS = [
  "Shorter",
  "More technical",
  "More direct",
  "Emphasize portfolio",
] as const;

export const STRENGTH_LABEL: Record<string, string> = {
  high: "High strength",
  medium: "Medium strength",
  low: "Low strength",
};

export const IMPLEMENTATION_STATUS_LABEL: Record<string, string> = {
  designed: "Designed",
  deployed: "Deployed",
  hybrid: "Hybrid",
};

export const AUDIT_CATEGORY_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  ux: { label: "UX", tone: "info" },
  ui: { label: "UI", tone: "info" },
  performance: { label: "Performance", tone: "warning" },
  accessibility: { label: "Accessibility", tone: "danger" },
  seo: { label: "SEO", tone: "warning" },
  conversion: { label: "Conversion", tone: "success" },
  technical: { label: "Technical", tone: "muted" },
};

export const OPPORTUNITY_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  lead_capture: { label: "Lead Capture", tone: "success" },
  appointment: { label: "Appointment Booking", tone: "success" },
  crm: { label: "CRM", tone: "info" },
  ecommerce: { label: "E-commerce", tone: "info" },
  email: { label: "Email Automation", tone: "info" },
  whatsapp: { label: "WhatsApp", tone: "warning" },
  support: { label: "Support", tone: "warning" },
  quote: { label: "Quote/Estimate", tone: "info" },
  internal_workflow: { label: "Internal Workflow", tone: "muted" },
  ai_agent: { label: "AI Agent", tone: "warning" },
  seo: { label: "SEO", tone: "info" },
  performance: { label: "Performance", tone: "warning" },
  ui_ux: { label: "UI/UX", tone: "info" },
  other: { label: "Other", tone: "muted" },
};

export const OUTBOUND_STATUS_META: Record<
  OutboundStatus,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  researching: { label: "Researching", tone: "muted" },
  pitch_drafted: { label: "Draft", tone: "info" },
  need_approval: { label: "Needs approval", tone: "warning" },
  approved: { label: "Approved", tone: "warning" },
  rejected: { label: "Rejected", tone: "danger" },
  sending: { label: "Sending", tone: "warning" },
  sent: { label: "Sent", tone: "info" },
  replied: { label: "Replied", tone: "success" },
  follow_up_1: { label: "Follow-up 1", tone: "info" },
  follow_up_2: { label: "Follow-up 2", tone: "info" },
  done: { label: "Done", tone: "success" },
  do_not_contact: { label: "Do not contact", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
};

export const OUTBOUND_MESSAGE_STATUS_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  draft: { label: "Draft", tone: "muted" },
  queued: { label: "Queued", tone: "info" },
  sent: { label: "Sent", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  opened: { label: "Opened", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

export const REPLY_CLASSIFICATION_META: Record<
  ReplyClassification,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  interested: { label: "Interested", tone: "success" },
  question: { label: "Question", tone: "info" },
  not_interested: { label: "Not interested", tone: "muted" },
  wrong_person: { label: "Wrong person", tone: "warning" },
  unsubscribe: { label: "Unsubscribe", tone: "danger" },
};

export const SUPPRESSION_REASON_META: Record<
  SuppressionReason,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  unsubscribed: { label: "Unsubscribed", tone: "danger" },
  replied_stop: { label: "Replied stop", tone: "danger" },
  bounced: { label: "Bounced", tone: "warning" },
  manual: { label: "Manual block", tone: "info" },
  legal: { label: "Legal hold", tone: "danger" },
};
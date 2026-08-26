import type { ApplicationOutcome, Recommendation } from "@/lib/types/database";
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

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/settings", label: "Settings" },
] as const;

/** Scoring factors and weights from the PRD §8.1. */
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
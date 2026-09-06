import type { SupabaseClient } from "@supabase/supabase-js";

export type Recommendation = "APPLY" | "REVIEW" | "SKIP";
export type ApplicationOutcome =
  | "unknown"
  | "viewed"
  | "interview"
  | "hired"
  | "rejected";

export interface ProfileRow {
  id: string;
  name: string;
  headline: string;
  bio: string | null;
  services: string[];
  target_rate_min: number | null;
  target_rate_max: number | null;
  niches: string[];
  behance_url: string | null;
  pinterest_url: string | null;
  linkedin_url: string | null;
  upwork_profile_url: string | null;
  website_url: string | null;
  label: string;
  pillar: "design" | "build" | "automation" | "growth" | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioProjectRow {
  id: string;
  title: string;
  description: string | null;
  skills: string[];
  strength: "high" | "medium" | "low";
  implementation_status: "designed" | "deployed" | "hybrid";
  evidence_links: string[];
  image_urls: string[];
  source_url: string | null;
  can_claim_text: string;
  cannot_claim_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRow {
  id: string;
  source: "upwork_email" | "upwork_api" | "ats_api";
  raw_payload: unknown;
  title: string;
  description: string;
  skills_requested: string[];
  budget_min: number | null;
  budget_max: number | null;
  budget_type: "fixed" | "hourly" | "salary" | null;
  client_rating: number | null;
  client_reviews_count: number | null;
  client_jobs_posted: number | null;
  client_hire_rate: number | null;
  proposals_count: string | null;
  posted_at: string;
  url: string;
  ingested_at: string;
  skipped_at: string | null;
  skip_reason: string | null;
  company_name: string | null;
  location: string | null;
  is_remote: boolean | null;
}

export interface ScoreFactor {
  [key: string]: number;
}

export interface JobScoreRow {
  id: string;
  job_id: string;
  profile_id: string;
  score_total: number;
  confidence: number;
  recommendation: Recommendation;
  explanation: string;
  factors: ScoreFactor;
  created_at: string;
}

export interface ProposalRow {
  id: string;
  job_id: string;
  draft_text: string;
  angle: string;
  used_projects: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationRow {
  id: string;
  job_id: string;
  proposal_id: string | null;
  score_at_apply: number;
  outcome: ApplicationOutcome;
  notes: string | null;
  applied_at: string;
}

export interface ManualReviewQueueRow {
  id: string;
  job_id: string | null;
  error_reason: string;
  raw_email: unknown;
  status: "pending" | "resolved" | "skipped";
  created_at: string;
}

export type WatchedCompanyPlatform =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "smartrecruiters"
  | "personio"
  | "recruitee"
  | "unknown";

export interface WatchedCompanyRow {
  id: string;
  name: string;
  platform: WatchedCompanyPlatform;
  board_token: string | null;
  careers_url: string;
  region: "us" | "eu";
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Joined view: job + latest score + latest proposal. */
export interface JobFeedRow extends JobRow {
  score_id: string | null;
  score_total: number | null;
  confidence: number | null;
  recommendation: Recommendation | null;
  explanation: string | null;
  factors: ScoreFactor | null;
  score_created_at: string | null;
  score_profile_id: string | null;
  proposal_id: string | null;
  proposal_draft_text: string | null;
  proposal_angle: string | null;
  proposal_used_projects: string[] | null;
  proposal_version: number | null;
}

export type DatabaseClient = SupabaseClient;

/* ------------------------------------------------------------------ */
/* Website Auditor types                                               */
/* ------------------------------------------------------------------ */

export type AuditStatus =
  | "created"
  | "queued"
  | "crawling"
  | "analyzing"
  | "scoring"
  | "opportunities"
  | "completed"
  | "failed"
  | "cancelled";

export type AuditIssueCategory =
  | "ux"
  | "ui"
  | "performance"
  | "accessibility"
  | "seo"
  | "conversion"
  | "technical";

export type AuditSeverity = "critical" | "high" | "medium" | "low" | "info";

export type AuditClassification = "observed" | "inferred" | "confirmed";

export type AuditOpportunityCategory =
  | "lead_capture"
  | "appointment"
  | "crm"
  | "ecommerce"
  | "email"
  | "whatsapp"
  | "support"
  | "quote"
  | "internal_workflow"
  | "ai_agent"
  | "seo"
  | "performance"
  | "ui_ux"
  | "other";

export type TechCategory =
  | "cms"
  | "framework"
  | "crm"
  | "analytics"
  | "forms"
  | "booking"
  | "ecommerce"
  | "chat"
  | "email"
  | "payment"
  | "cdn"
  | "other";

export type PipelineStatus =
  | "prospecting"
  | "contacted"
  | "proposal_sent"
  | "negotiating"
  | "won"
  | "lost";

export interface AuditRow {
  id: string;
  url: string;
  business_name: string | null;
  industry: string | null;
  location: string | null;
  status: AuditStatus;
  error_message: string | null;
  overall_score: number | null;
  automation_score: number | null;
  ui_score: number | null;
  ux_score: number | null;
  performance_score: number | null;
  accessibility_score: number | null;
  seo_score: number | null;
  conversion_score: number | null;
  raw_crawl_data: unknown;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AuditPageRow {
  id: string;
  audit_id: string;
  url: string;
  path: string | null;
  title: string | null;
  screenshot_desktop_url: string | null;
  screenshot_mobile_url: string | null;
  lighthouse_score: number | null;
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  ttfb_ms: number | null;
  axe_violations_count: number;
  axe_violations: unknown;
  seo_score: number | null;
  seo_data: unknown;
  dom_snapshot: unknown;
  console_errors: unknown;
  crawled_at: string | null;
}

export interface AuditTechnologyRow {
  id: string;
  audit_id: string;
  name: string;
  category: TechCategory;
  confidence: number;
  evidence: string | null;
  detected_at: string;
}

export interface AuditIssueRow {
  id: string;
  audit_id: string;
  page_id: string | null;
  category: AuditIssueCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
  evidence: string | null;
  recommendation: string | null;
  classification: AuditClassification;
  created_at: string;
}

export interface AuditOpportunityRow {
  id: string;
  audit_id: string;
  title: string;
  category: AuditOpportunityCategory;
  observed_signal: string;
  evidence: string;
  inference: string | null;
  confidence: number;
  business_impact: "high" | "medium" | "low";
  automation_potential: "high" | "medium" | "low";
  estimated_complexity: "simple" | "moderate" | "complex";
  recommended_tools: string[];
  recommended_workflow: string | null;
  implementation_notes: string | null;
  outreach_angle: string | null;
  score: number | null;
  classification: AuditClassification;
  created_at: string;
}

export interface AuditOpportunityServiceRow {
  id: string;
  opportunity_id: string;
  service_name: string;
  service_description: string | null;
  estimated_hours: number | null;
}

export interface ProspectRow {
  id: string;
  company_name: string;
  website_url: string | null;
  industry: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: string | null;
  website_score: number | null;
  automation_score: number | null;
  technology_stack: string[];
  pipeline_status: PipelineStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectAuditRow {
  prospect_id: string;
  audit_id: string;
  is_primary: boolean;
  created_at: string;
}

declare module "@supabase/supabase-js" {
  // Placeholder to keep SupabaseClient untyped generics simple for V1.
}
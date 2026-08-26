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

declare module "@supabase/supabase-js" {
  // Placeholder to keep SupabaseClient untyped generics simple for V1.
}
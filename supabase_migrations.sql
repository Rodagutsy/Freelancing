-- Supabase SQL Migrations (V1)
-- Run these in the Supabase SQL Editor to create tables and basic indexes.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  headline TEXT NOT NULL,
  services TEXT[] NOT NULL DEFAULT '{}',
  target_rate_min NUMERIC,
  target_rate_max NUMERIC,
  niches TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_name ON profiles(name);

-- 2. portfolio_projects
CREATE TABLE portfolio_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  strength TEXT NOT NULL DEFAULT 'medium' CHECK (strength IN ('high','medium','low')),
  implementation_status TEXT NOT NULL DEFAULT 'designed' CHECK (implementation_status IN ('designed','deployed','hybrid')),
  evidence_links TEXT[] NOT NULL DEFAULT '{}',
  can_claim_text TEXT NOT NULL,
  cannot_claim_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_skills ON portfolio_projects USING GIN(skills);

-- 3. jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('upwork_email','upwork_api')),
  raw_payload JSONB NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills_requested TEXT[] NOT NULL DEFAULT '{}',
  budget_min NUMERIC,
  budget_max NUMERIC,
  budget_type TEXT CHECK (budget_type IN ('fixed','hourly')),
  client_rating NUMERIC,
  client_reviews_count INT,
  client_jobs_posted INT,
  client_hire_rate NUMERIC,
  proposals_count TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  url TEXT NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_skills ON jobs USING GIN(skills_requested);

-- 4. job_scores
CREATE TABLE job_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score_total NUMERIC NOT NULL CHECK (score_total >= 0 AND score_total <= 10),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('APPLY','REVIEW','SKIP')),
  explanation TEXT NOT NULL,
  factors JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_scores_job_id ON job_scores(job_id);
CREATE INDEX idx_job_scores_score ON job_scores(score_total DESC);

-- 5. proposals
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  draft_text TEXT NOT NULL,
  angle TEXT NOT NULL,
  used_projects UUID[] NOT NULL DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proposals_job_id ON proposals(job_id);

-- 6. applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  score_at_apply NUMERIC NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'unknown' CHECK (outcome IN ('viewed','interview','hired','rejected','unknown')),
  notes TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_outcome ON applications(outcome);

-- Optional: manual_review_queue (for parsing/AI errors)
CREATE TABLE manual_review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  error_reason TEXT NOT NULL,
  raw_email JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_manual_review_status ON manual_review_queue(status);

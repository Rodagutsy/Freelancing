import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Briefcase,
  Clock,
  ExternalLink,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJobDetail, matchPortfolioProjects } from "@/lib/services/jobs";
import { getApplicationForJob } from "@/lib/services/applications";
import { listPortfolioProjects } from "@/lib/services/portfolio";
import { getDefaultProfile, getProfiles } from "@/lib/services/settings";
import { formatCurrencyRange, formatPosted } from "@/lib/utils";
import { JobDecisionPanel } from "@/components/jobs/JobDecisionPanel";
import { ScoreBreakdown } from "@/components/jobs/ScoreBreakdown";
import { EvidenceCard } from "@/components/jobs/EvidenceCard";
import { ProposalEditor } from "@/components/proposals/ProposalEditor";
import { ApplicationQA } from "@/components/jobs/ApplicationQA";
import { NotesEditor } from "@/components/applications/NotesEditor";
import { SkillTag } from "@/components/common/SkillTag";
import { MetadataRow } from "@/components/jobs/MetadataRow";
import { ConfidenceIndicator } from "@/components/jobs/ConfidenceIndicator";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: JobDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const job = await getJobDetail(supabase, id);
  return {
    title: job?.title ?? "Job",
  };
}

function confidenceNote(input: {
  budget_min: number | null;
  budget_max: number | null;
  client_rating: number | null;
}): string | null {
  const gaps: string[] = [];
  if (input.budget_min === null && input.budget_max === null) gaps.push("budget");
  if (input.client_rating === null) gaps.push("client history");
  if (gaps.length === 0) return null;
  return `lower confidence because the email did not include ${gaps.join(" or ")}`;
}

export default async function JobDetailPage({
  params,
}: JobDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const feed = await getJobDetail(supabase, id);
  if (!feed) notFound();

  const [application, projects, profiles, defaultProfile] = await Promise.all([
    getApplicationForJob(supabase, id),
    listPortfolioProjects(supabase),
    getProfiles(supabase),
    getDefaultProfile(supabase),
  ]);

  const personaOptions = profiles.map((p) => ({ id: p.id, label: p.label }));
  const scoredBy =
    feed.score_profile_id != null
      ? (profiles.find((p) => p.id === feed.score_profile_id)?.label ?? null)
      : null;
  // Proposal drafts default to the persona that scored the job, else the default.
  const draftPersonaId = feed.score_profile_id ?? defaultProfile?.id ?? null;

  const usedIds = feed.proposal_used_projects ?? [];
  const proposedProjects = projects.filter((p) => usedIds.includes(p.id));
  const citedProjects =
    proposedProjects.length > 0
      ? proposedProjects
      : matchPortfolioProjects(projects, feed.skills_requested, 3);

  const score = feed.score_total;
  const canGenerate = (score ?? 0) >= 7 || Boolean(feed.proposal_id);

  const clientFields: Array<{ label: string; value: string | null }> = [
    { label: "Client rating", value: feed.client_rating?.toFixed(1) ?? null },
    {
      label: "Reviews",
      value: feed.client_reviews_count !== null ? String(feed.client_reviews_count) : null,
    },
    {
      label: "Jobs posted",
      value: feed.client_jobs_posted !== null ? String(feed.client_jobs_posted) : null,
    },
    {
      label: "Hire rate",
      value: feed.client_hire_rate !== null ? `${feed.client_hire_rate}%` : null,
    },
  ].filter((f) => f.value !== null);

  return (
    <div>
      <section className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{feed.title}</h1>
          <p className={styles.posted}>
            <Clock className={styles.postedIcon} aria-hidden />
            Posted {formatPosted(feed.posted_at)}
          </p>
        </div>
        <a
          href={feed.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.upworkLink}
        >
          <ExternalLink className={styles.upworkLinkIcon} aria-hidden />
          View on Upwork
        </a>
      </section>

      <div className={styles.layout}>
        <aside className={styles.panel}>
          <JobDecisionPanel
            jobId={feed.id}
            jobUrl={feed.url}
            scoreTotal={score}
            confidence={feed.confidence}
            recommendation={feed.recommendation}
            latestDraftText={feed.proposal_draft_text}
            application={application}
            skippedAt={feed.skipped_at}
            skipReason={feed.skip_reason}
            confidenceNote={confidenceNote(feed)}
            profiles={personaOptions}
            scoredByLabel={scoredBy}
          />
        </aside>

        <div className={styles.main}>
          <section className={styles.section} aria-labelledby="why-score">
            <h2 id="why-score" className={styles.sectionTitle}>
              Why this score
            </h2>
            {feed.explanation ? (
              <>
                <p className={styles.explanation}>{feed.explanation}</p>
                <ScoreBreakdown factors={feed.factors} />
                <ConfidenceIndicator
                  confidence={feed.confidence}
                  note={confidenceNote(feed)}
                />
              </>
            ) : (
              <p className={styles.unscored}>
                This job has not been scored yet. Add it through your n8n
                workflow or wait for the next scoring run.
              </p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="requirements">
            <h2 id="requirements" className={styles.sectionTitle}>
              Job requirements
            </h2>
            <MetadataRow
              items={[
                {
                  label: "Budget",
                  value: formatCurrencyRange(feed.budget_min, feed.budget_max),
                  icon: Wallet,
                },
                {
                  label: "Budget type",
                  value: feed.budget_type === "hourly" ? "Hourly" : feed.budget_type === "fixed" ? "Fixed" : "—",
                  icon: Briefcase,
                },
                {
                  label: "Proposals",
                  value: feed.proposals_count ?? "—",
                  icon: Users,
                },
                {
                  label: "Hire rate",
                  value: feed.client_hire_rate !== null ? `${feed.client_hire_rate}%` : "—",
                  icon: TrendingUp,
                },
                ...clientFields.map((f) => ({
                  label: f.label,
                  value: f.value ?? "—",
                  icon: f.label === "Client rating" ? Star : undefined,
                })),
              ]}
            />
            <p className={styles.description}>{feed.description}</p>
            {feed.skills_requested.length > 0 && (
              <div className={styles.skills}>
                {feed.skills_requested.map((skill) => (
                  <SkillTag key={skill} tone="gold">
                    {skill}
                  </SkillTag>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section} aria-labelledby="evidence">
            <h2 id="evidence" className={styles.sectionTitle}>
              Matched evidence
            </h2>
            {citedProjects.length > 0 ? (
              <div className={styles.evidenceList}>
                {citedProjects.map((project) => (
                  <EvidenceCard
                    key={project.id}
                    project={project}
                    skillsRequested={feed.skills_requested}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.unscored}>
                No portfolio projects matched this job yet. Add verified
                portfolio evidence in Portfolio to strengthen future proposals.
              </p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="proposal">
            <h2 id="proposal" className={styles.sectionTitle}>
              Proposal draft
            </h2>
            <ProposalEditor
              key={feed.proposal_version ?? 0}
              jobId={feed.id}
              proposal={
                feed.proposal_draft_text
                  ? {
                      draft_text: feed.proposal_draft_text,
                      angle: feed.proposal_angle ?? "",
                      version: feed.proposal_version ?? 1,
                    }
                  : null
              }
              canGenerate={canGenerate}
              profiles={personaOptions}
              defaultPersonaId={draftPersonaId}
            />
          </section>

          <section className={styles.section} aria-labelledby="application-questions">
            <h2 id="application-questions" className={styles.sectionTitle}>
              Screening questions
            </h2>
            <ApplicationQA
              key={`qa-${feed.id}-${draftPersonaId ?? "default"}`}
              jobId={feed.id}
              profiles={personaOptions}
              defaultPersonaId={draftPersonaId}
            />
          </section>

          <section className={styles.section} aria-labelledby="application-status">
            <h2 id="application-status" className={styles.sectionTitle}>
              Application status
            </h2>
            {application ? (
              <p className={styles.appliedInfo}>
                Logged as applied on{" "}
                <strong>{formatPosted(application.applied_at)}</strong> with a
                score of <strong>{application.score_at_apply.toFixed(1)}</strong>.
                Current outcome: <strong>{application.outcome}</strong>.
              </p>
            ) : (
              <p className={styles.appliedInfo}>
                Not applied yet. Use the decision panel to log this job.
              </p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="notes">
            <h2 id="notes" className={styles.sectionTitle}>
              Notes
            </h2>
            <NotesEditor
              key={application?.notes ?? "no-notes"}
              jobId={feed.id}
              hasApplication={Boolean(application)}
              initialNotes={application?.notes ?? null}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
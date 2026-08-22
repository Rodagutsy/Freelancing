import Link from "next/link";
import { ArrowRight, Clock, Star, Users, Wallet } from "lucide-react";
import { formatCurrencyRange, formatRelative, truncate } from "@/lib/utils";
import type { JobFeedRow } from "@/lib/types";
import { RecommendationBadge } from "@/components/jobs/RecommendationBadge";
import { JobScore } from "@/components/jobs/JobScore";
import { ConfidenceIndicator } from "@/components/jobs/ConfidenceIndicator";
import { MetadataRow } from "@/components/jobs/MetadataRow";
import { SkillTag } from "@/components/common/SkillTag";
import styles from "./JobCard.module.css";

function confidenceNote(job: JobFeedRow): string | null {
  const gaps: string[] = [];
  if (job.budget_min === null && job.budget_max === null) gaps.push("budget");
  if (job.client_rating === null) gaps.push("client history");
  if (gaps.length === 0) return null;
  return `lower confidence because the email did not include ${gaps.join(" or ")}`;
}

export function JobCard({ job }: { job: JobFeedRow }) {
  const skills = job.skills_requested.slice(0, 3);
  const summary = job.explanation ? truncate(job.explanation, 170) : null;
  const note = confidenceNote(job);

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <RecommendationBadge recommendation={job.recommendation} />
        <JobScore score={job.score_total} size="sm" />
      </div>

      <h3 className={styles.title}>
        <Link href={`/jobs/${job.id}`} className={styles.titleLink}>
          {job.title}
        </Link>
      </h3>

      {job.score_total !== null && (
        <ConfidenceIndicator confidence={job.confidence} note={note} />
      )}

      {summary && <p className={styles.summary}>{summary}</p>}

      <MetadataRow
        items={[
          {
            label: "Budget",
            value: formatCurrencyRange(job.budget_min, job.budget_max),
            icon: Wallet,
          },
          {
            label: "Client rating",
            value: job.client_rating !== null ? job.client_rating.toFixed(1) : "—",
            icon: Star,
          },
          {
            label: "Proposals",
            value: job.proposals_count ?? "—",
            icon: Users,
          },
          {
            label: "Posted",
            value: formatRelative(job.posted_at),
            icon: Clock,
          },
        ]}
      />

      {skills.length > 0 && (
        <div className={styles.skills}>
          {skills.map((skill) => (
            <SkillTag key={skill} tone="gold">
              {skill}
            </SkillTag>
          ))}
        </div>
      )}

      {job.skipped_at && (
        <p className={styles.skipReason} role="status">
          Skipped — {job.skip_reason ?? "no reason given"}
        </p>
      )}

      <div className={styles.footer}>
        <Link href={`/jobs/${job.id}`} className={styles.action}>
          Review job
          <ArrowRight className={styles.actionIcon} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
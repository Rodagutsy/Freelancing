import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listApplications } from "@/lib/services/applications";
import {
  interviewRateByBudget,
  interviewRateByScoreBand,
  proposalAngleStats,
} from "@/lib/analytics";
import { formatRelative } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/common/Button";
import { OutcomeBadge } from "@/components/applications/OutcomeBadge";
import { ApplicationRowActions } from "@/components/applications/ApplicationRowActions";
import type { ProposalRow } from "@/lib/types";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const applications = await listApplications(supabase);

  const proposalIds = Array.from(
    new Set(
      applications.map((a) => a.proposal_id).filter((id): id is string => Boolean(id)),
    ),
  );
  const proposals: ProposalRow[] = [];
  if (proposalIds.length > 0) {
    const { data } = await supabase
      .from("proposals")
      .select("*")
      .in("id", proposalIds);
    proposals.push(...((data ?? []) as ProposalRow[]));
  }

  const scoreBands = interviewRateByScoreBand(applications);
  const budgetBands = interviewRateByBudget(applications);
  const angleStats = proposalAngleStats(applications, proposals);
  const hasAnalytics = applications.length > 0;

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Track what you applied to, log outcomes, and learn which jobs convert."
      />

      {hasAnalytics && (
        <section className={styles.analytics} aria-label="Learning loop">
          <h2 className={styles.sectionTitle}>Learning loop</h2>
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsCard}>
              <h3 className={styles.cardTitle}>Interview rate by score band</h3>
              <div className={styles.statList}>
                {scoreBands.map((band) => (
                  <div key={band.label} className={styles.statRow}>
                    <span className={styles.statLabel}>{band.label}</span>
                    <span className={styles.statDetail}>
                      {band.total} applied · {band.interviews} interviewed
                    </span>
                    <span className={styles.statRate}>
                      {band.rate !== null
                        ? `${Math.round(band.rate * 100)}%`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.analyticsCard}>
              <h3 className={styles.cardTitle}>Interview rate by budget</h3>
              <div className={styles.statList}>
                {budgetBands.map((band) => (
                  <div key={band.label} className={styles.statRow}>
                    <span className={styles.statLabel}>{band.label}</span>
                    <span className={styles.statDetail}>
                      {band.total} applied · {band.interviews} interviewed
                    </span>
                    <span className={styles.statRate}>
                      {band.rate !== null
                        ? `${Math.round(band.rate * 100)}%`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {angleStats.length > 0 && (
              <div className={styles.analyticsCard}>
                <h3 className={styles.cardTitle}>Best performing angles</h3>
                <div className={styles.statList}>
                  {angleStats.map((stat) => (
                    <div key={stat.angle} className={styles.statRow}>
                      <span className={styles.statLabel}>{stat.angle}</span>
                      <span className={styles.statDetail}>
                        {stat.total} applied · {stat.interviews} interviewed
                      </span>
                      <span className={styles.statRate}>
                        {stat.rate !== null
                          ? `${Math.round(stat.rate * 100)}%`
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section aria-label="Applied jobs">
        {applications.length > 0 ? (
          <div className={styles.table}>
            <div className={styles.tableHeader} aria-hidden>
              <span>Job</span>
              <span>Score</span>
              <span>Outcome</span>
              <span>Status</span>
              <span>Applied</span>
              <span>Notes</span>
            </div>
            {applications.map((app) => (
              <div key={app.id} className={styles.tableRow}>
                <div className={styles.cellJob}>
                  {app.job ? (
                    <Link href={`/jobs/${app.job.id}`} className={styles.jobLink}>
                      {app.job.title}
                    </Link>
                  ) : (
                    <span className={styles.mutedText}>Job removed</span>
                  )}
                </div>
                <div className={styles.cellScore}>
                  <strong>{app.score_at_apply.toFixed(1)}</strong>
                </div>
                <div className={styles.cellOutcome}>
                  <OutcomeBadge outcome={app.outcome} />
                </div>
                <div className={styles.cellStatus}>
                  <ApplicationRowActions
                    jobId={app.job_id}
                    outcome={app.outcome}
                  />
                </div>
                <div className={styles.cellDate}>{formatRelative(app.applied_at)}</div>
                <div className={styles.cellNotes}>
                  {app.notes ? (
                    <span className={styles.notesText}>{app.notes}</span>
                  ) : (
                    <span className={styles.mutedText}>—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No applications logged"
            description="Mark a reviewed job as applied to start tracking outcomes."
            action={
              <Link href="/jobs">
                <Button variant="secondary">View jobs</Button>
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
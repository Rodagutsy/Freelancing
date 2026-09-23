import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { greetingForHour } from "@/lib/utils";
import {
  getDashboardStats,
  listJobs,
} from "@/lib/services/jobs";
import { getDefaultProfile } from "@/lib/services/settings";
import { getOutreachDashboardMetrics } from "@/lib/services/outreachMetrics";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/common/Button";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/common/EmptyState";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [stats, applyNow, review, profile, outreach] = await Promise.all([
    getDashboardStats(supabase),
    listJobs(supabase, { status: "apply", limit: 6 }),
    listJobs(supabase, { status: "review", limit: 6 }),
    getDefaultProfile(supabase),
    getOutreachDashboardMetrics(supabase),
  ]);

  const now = new Date();
  const greeting = `${greetingForHour(now.getHours())}, ${profile?.name ?? "Dee"}`;
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title={greeting}
        description={dateLabel}
        action={
          <Link href="/jobs?score=9">
            <Button>View high-fit jobs</Button>
          </Link>
        }
      />

      <section className={styles.strip} aria-label="Today's decisions">
        <div className={styles.stripItem}>
          <CircleCheck className={`${styles.stripIcon} ${styles.success}`} aria-hidden />
          <div>
            <p className={styles.stripValue}>{stats.applyToday}</p>
            <p className={styles.stripLabel}>Apply now</p>
          </div>
        </div>
        <div className={styles.stripItem}>
          <CircleAlert className={`${styles.stripIcon} ${styles.warning}`} aria-hidden />
          <div>
            <p className={styles.stripValue}>{stats.reviewToday}</p>
            <p className={styles.stripLabel}>Review</p>
          </div>
        </div>
        <div className={styles.stripItem}>
          <CircleX className={`${styles.stripIcon} ${styles.danger}`} aria-hidden />
          <div>
            <p className={styles.stripValue}>{stats.skipToday}</p>
            <p className={styles.stripLabel}>Skipped today</p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-label="Outreach overview">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Outreach</h2>
          <Link href="/outbounds" className={styles.sectionLink}>
            Open outreach
            <ArrowRight className={styles.sectionLinkIcon} aria-hidden />
          </Link>
        </div>
        <div className={styles.outreachGrid}>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{outreach.inProgress}</p>
            <p className={styles.outreachLabel}>In progress</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{outreach.awaitingFollowUp}</p>
            <p className={styles.outreachLabel}>Awaiting follow-up</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{outreach.replied}</p>
            <p className={styles.outreachLabel}>Replied</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{outreach.replyRate}%</p>
            <p className={styles.outreachLabel}>Reply rate</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{outreach.suppressed}</p>
            <p className={styles.outreachLabel}>Blocked</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{outreach.completed}</p>
            <p className={styles.outreachLabel}>Completed</p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-label="Apply now jobs">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Apply now</h2>
          <Link href="/jobs?score=9" className={styles.sectionLink}>
            View all
            <ArrowRight className={styles.sectionLinkIcon} aria-hidden />
          </Link>
        </div>
        {applyNow.items.length > 0 ? (
          <div className={styles.jobList}>
            {applyNow.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No high-fit jobs yet"
            description="New jobs from your saved searches will appear here after they are scored."
            action={
              <Link href="/jobs">
                <Button variant="secondary">View all jobs</Button>
              </Link>
            }
          />
        )}
      </section>

      <section className={styles.section} aria-label="Needs review jobs">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Needs review</h2>
          <Link href="/jobs?score=7" className={styles.sectionLink}>
            View all
            <ArrowRight className={styles.sectionLinkIcon} aria-hidden />
          </Link>
        </div>
        {review.items.length > 0 ? (
          <div className={styles.jobList}>
            {review.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing to review"
            description="Jobs scoring 7–8.9 will show here when there is something to decide on."
            action={
              <Link href="/jobs">
                <Button variant="secondary">View all jobs</Button>
              </Link>
            }
          />
        )}
      </section>

      <section className={styles.metrics} aria-label="Overview metrics">
        <div className={styles.metric}>
          <p className={styles.metricValue}>{stats.jobsAnalyzed}</p>
          <p className={styles.metricLabel}>Jobs analyzed</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricValue}>{stats.highFit}</p>
          <p className={styles.metricLabel}>High-fit jobs</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricValue}>{stats.proposalsDrafted}</p>
          <p className={styles.metricLabel}>Proposals drafted</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricValue}>{stats.applicationsLogged}</p>
          <p className={styles.metricLabel}>Applications logged</p>
        </div>
      </section>
    </div>
  );
}
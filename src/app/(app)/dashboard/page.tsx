import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { greetingForHour } from "@/lib/utils";
import { getDashboardStats, listJobs } from "@/lib/services/jobs";
import { getDefaultProfile, getProfiles } from "@/lib/services/settings";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/common/Button";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/common/EmptyState";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const profiles = await getProfiles(supabase);
  const personaCount = profiles.length;

  const [stats, applyNow, review, latest, profile] = await Promise.all([
    getDashboardStats(supabase, personaCount),
    listJobs(supabase, { status: "apply", personaCount, limit: 5 }),
    listJobs(supabase, { status: "review", personaCount, limit: 5 }),
    listJobs(supabase, {
      status: "all",
      postedHours: 0,
      personaCount,
      sort: "ingested",
      limit: 5,
    }),
    getDefaultProfile(supabase),
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
        <Link href="/jobs?status=apply&posted=0" className={styles.stripItem}>
          <CircleCheck className={`${styles.stripIcon} ${styles.success}`} aria-hidden />
          <div>
            <p className={styles.stripValue}>{stats.applyToday}</p>
            <p className={styles.stripLabel}>Apply now</p>
          </div>
        </Link>
        <Link href="/jobs?status=review&posted=0" className={styles.stripItem}>
          <CircleAlert className={`${styles.stripIcon} ${styles.warning}`} aria-hidden />
          <div>
            <p className={styles.stripValue}>{stats.reviewToday}</p>
            <p className={styles.stripLabel}>Review</p>
          </div>
        </Link>
        <Link href="/jobs?status=skip&posted=0" className={styles.stripItem}>
          <CircleX className={`${styles.stripIcon} ${styles.danger}`} aria-hidden />
          <div>
            <p className={styles.stripValue}>{stats.skipToday}</p>
            <p className={styles.stripLabel}>Skipped today</p>
          </div>
        </Link>
      </section>

      <section className={styles.section} aria-label="Analytics">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Analytics</h2>
          <Link href="/jobs" className={styles.sectionLink}>
            All jobs
            <ArrowRight className={styles.sectionLinkIcon} aria-hidden />
          </Link>
        </div>
        <div className={styles.metrics}>
          <Link href="/jobs?score=0&posted=0" className={styles.metric}>
            <p className={styles.metricValue}>{stats.jobsAnalyzed}</p>
            <p className={styles.metricLabel}>Jobs imported</p>
          </Link>
          <Link href="/jobs?score=7&posted=0" className={styles.metric}>
            <p className={styles.metricValue}>{stats.highFit}</p>
            <p className={styles.metricLabel}>High-fit jobs</p>
          </Link>
          <Link href="/applications" className={styles.metric}>
            <p className={styles.metricValue}>{stats.proposalsDrafted}</p>
            <p className={styles.metricLabel}>Proposals drafted</p>
          </Link>
          <Link href="/applications" className={styles.metric}>
            <p className={styles.metricValue}>{stats.applicationsLogged}</p>
            <p className={styles.metricLabel}>Applications logged</p>
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-label="Latest jobs">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Latest jobs</h2>
          <Link href="/jobs" className={styles.sectionLink}>
            View all
            <ArrowRight className={styles.sectionLinkIcon} aria-hidden />
          </Link>
        </div>
        {latest.items.length > 0 ? (
          <div className={styles.jobList}>
            {latest.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No jobs imported yet"
            description="Jobs from your saved searches and watched boards will appear here as they arrive."
            action={
              <Link href="/settings">
                <Button variant="secondary">Manage watched boards</Button>
              </Link>
            }
          />
        )}
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
    </div>
  );
}
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, CircleX, Globe, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { greetingForHour } from "@/lib/utils";
import {
  getDashboardStats,
  listJobs,
} from "@/lib/services/jobs";
import { getDefaultProfile } from "@/lib/services/settings";
import { getOutreachDashboardMetrics } from "@/lib/services/outreachMetrics";
import { getAuditStats, listAudits } from "@/lib/services/audits";
import { getProspectStats, listProspects } from "@/lib/services/prospects";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/common/Button";
import { JobCard } from "@/components/jobs/JobCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const AUDIT_STATUS_META: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }> = {
  created: { label: "Created", tone: "muted" },
  queued: { label: "Queued", tone: "muted" },
  crawling: { label: "Crawling", tone: "warning" },
  analyzing: { label: "Analyzing", tone: "warning" },
  scoring: { label: "Scoring", tone: "warning" },
  opportunities: { label: "Finding Opps", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

const PIPELINE_META: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }> = {
  prospecting: { label: "Prospecting", tone: "muted" },
  contacted: { label: "Contacted", tone: "info" },
  proposal_sent: { label: "Proposal Sent", tone: "warning" },
  negotiating: { label: "Negotiating", tone: "warning" },
  won: { label: "Won", tone: "success" },
  lost: { label: "Lost", tone: "danger" },
};

function auditName(url: string, businessName: string | null): string {
  if (businessName) return businessName;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [stats, applyNow, review, profile, outreach, recentAudits, recentProspects] =
    await Promise.all([
      getDashboardStats(supabase),
      listJobs(supabase, { status: "apply", limit: 6 }),
      listJobs(supabase, { status: "review", limit: 6 }),
      getDefaultProfile(supabase),
      getOutreachDashboardMetrics(supabase),
      Promise.all([getAuditStats(supabase), listAudits(supabase, { limit: 4 })])
        .then(([auditStats, audits]) => ({ ...auditStats, items: audits.items })),
      Promise.all([getProspectStats(supabase), listProspects(supabase, { limit: 4 })])
        .then(([prospectStats, prospects]) => ({ ...prospectStats, items: prospects.items })),
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

      <section className={styles.section} aria-label="Audit overview">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Website audits</h2>
          <Link href="/audits" className={styles.sectionLink}>
            Open audits
            <ArrowRight className={styles.sectionLinkIcon} aria-hidden />
          </Link>
        </div>
        <div className={styles.outreachGrid}>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{recentAudits.inProgress}</p>
            <p className={styles.outreachLabel}>In progress</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{recentAudits.completed}</p>
            <p className={styles.outreachLabel}>Completed</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{recentAudits.failed}</p>
            <p className={styles.outreachLabel}>Failed</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{recentAudits.total}</p>
            <p className={styles.outreachLabel}>Total</p>
          </div>
        </div>
        {recentAudits.items.length > 0 ? (
          <div className={styles.jobList}>
            {recentAudits.items.map((audit) => {
              const status = AUDIT_STATUS_META[audit.status] ?? {
                label: audit.status,
                tone: "muted" as const,
              };
              return (
                <Link key={audit.id} href={`/audits/${audit.id}`} className={styles.itemRow}>
                  <Globe className={styles.itemIcon} aria-hidden />
                  <div className={styles.itemBody}>
                    <p className={styles.itemName}>{auditName(audit.url, audit.business_name)}</p>
                    <p className={styles.itemMeta}>
                      {audit.industry ?? "Website"} · {audit.url}
                    </p>
                  </div>
                  <StatusBadge label={status.label} tone={status.tone} />
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No audits yet"
            description="Analyze a business website to generate evidence for your pitch."
            action={
              <Link href="/audits">
                <Button variant="secondary">Start an audit</Button>
              </Link>
            }
          />
        )}
      </section>

      <section className={styles.section} aria-label="Prospect overview">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Prospects</h2>
          <Link href="/prospects" className={styles.sectionLink}>
            Open prospects
            <ArrowRight className={styles.sectionLinkIcon} aria-hidden />
          </Link>
        </div>
        <div className={styles.outreachGrid}>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{recentProspects.total}</p>
            <p className={styles.outreachLabel}>Total prospects</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>
              {recentProspects.byStatus.prospecting ?? 0}
            </p>
            <p className={styles.outreachLabel}>Prospecting</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{recentProspects.byStatus.won ?? 0}</p>
            <p className={styles.outreachLabel}>Won</p>
          </div>
          <div className={styles.outreachCell}>
            <p className={styles.outreachValue}>{recentProspects.byStatus.lost ?? 0}</p>
            <p className={styles.outreachLabel}>Lost</p>
          </div>
        </div>
        {recentProspects.items.length > 0 ? (
          <div className={styles.jobList}>
            {recentProspects.items.map((prospect) => {
              const pipeline = PIPELINE_META[prospect.pipeline_status] ?? {
                label: prospect.pipeline_status,
                tone: "muted" as const,
              };
              return (
                <Link key={prospect.id} href={`/prospects/${prospect.id}`} className={styles.itemRow}>
                  <UserRound className={styles.itemIcon} aria-hidden />
                  <div className={styles.itemBody}>
                    <p className={styles.itemName}>{prospect.company_name}</p>
                    <p className={styles.itemMeta}>
                      {[prospect.industry, prospect.location].filter(Boolean).join(" · ") ||
                        "Prospect"}
                    </p>
                  </div>
                  <StatusBadge label={pipeline.label} tone={pipeline.tone} />
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No prospects yet"
            description="Add businesses you're targeting and link audits to draft evidence-based outreach."
            action={
              <Link href="/prospects">
                <Button variant="secondary">Add a prospect</Button>
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
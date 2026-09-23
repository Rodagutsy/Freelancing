import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, BarChart3, Clock, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getAudit,
  getAuditPages,
  getAuditTechnologies,
  getAuditIssues,
  getAuditOpportunities,
} from "@/lib/services/audits";
import { formatRelative } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/common/ErrorState";
import { PitchButton } from "@/components/audits/PitchButton";
import { AuditProgressPoller } from "@/components/audits/AuditProgressPoller";
import { DeleteAuditButton } from "@/components/audits/DeleteAuditButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const STATUS_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
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

const SEVERITY_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  critical: { label: "Critical", tone: "danger" },
  high: { label: "High", tone: "danger" },
  medium: { label: "Medium", tone: "warning" },
  low: { label: "Low", tone: "info" },
  info: { label: "Info", tone: "muted" },
};

const OPP_CATEGORY_META: Record<string, { label: string }> = {
  lead_capture: { label: "Lead Capture" },
  appointment: { label: "Appointment Booking" },
  crm: { label: "CRM" },
  ecommerce: { label: "E-commerce" },
  email: { label: "Email Automation" },
  whatsapp: { label: "WhatsApp" },
  support: { label: "Support" },
  quote: { label: "Quote/Estimate" },
  internal_workflow: { label: "Internal Workflow" },
  ai_agent: { label: "AI Agent" },
  seo: { label: "SEO" },
  performance: { label: "Performance" },
  ui_ux: { label: "UI/UX" },
  other: { label: "Other" },
};

interface AuditDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AuditDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const audit = await getAudit(supabase, id);
  return {
    title: audit?.business_name ?? audit?.url ?? "Audit",
  };
}

export default async function AuditDetailPage({
  params,
}: AuditDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const audit = await getAudit(supabase, id);
  if (!audit) notFound();

  const status = STATUS_META[audit.status] ?? {
    label: audit.status,
    tone: "muted" as const,
  };

  const isCompleted = audit.status === "completed";
  const isInProgress = !isCompleted && audit.status !== "failed" && audit.status !== "cancelled";

  let pages: Awaited<ReturnType<typeof getAuditPages>> = [];
  let technologies: Awaited<ReturnType<typeof getAuditTechnologies>> = [];
  let issues: Awaited<ReturnType<typeof getAuditIssues>> = [];
  let opportunities: Awaited<ReturnType<typeof getAuditOpportunities>> = [];

  if (isCompleted || audit.status === "failed") {
    [pages, technologies, issues, opportunities] = await Promise.all([
      getAuditPages(supabase, audit.id),
      getAuditTechnologies(supabase, audit.id),
      getAuditIssues(supabase, audit.id),
      getAuditOpportunities(supabase, audit.id),
    ]);
  }

  const scores = [
    { label: "Overall", value: audit.overall_score },
    { label: "UI", value: audit.ui_score },
    { label: "UX", value: audit.ux_score },
    { label: "Performance", value: audit.performance_score },
    { label: "Accessibility", value: audit.accessibility_score },
    { label: "SEO", value: audit.seo_score },
    { label: "Conversion", value: audit.conversion_score },
    { label: "Automation", value: audit.automation_score },
  ].filter((s) => s.value !== null) as Array<{ label: string; value: number }>;

  return (
    <div>
      <AuditProgressPoller status={audit.status} />
      <section className={styles.header}>
        <PageHeader
          title={audit.business_name ?? audit.url}
          description={audit.industry ?? undefined}
          action={
            <div className={styles.actions}>
              <StatusBadge label={status.label} tone={status.tone} />
              <DeleteAuditButton auditId={audit.id} />
              <a
                href={audit.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.visitLink}
              >
                <ExternalLink size={16} aria-hidden />
                Visit site
              </a>
            </div>
          }
        >
          <div className={styles.headerMeta}>
            {audit.location && (
              <span className={styles.headerMetaItem}>
                <MapPin size={14} aria-hidden />
                {audit.location}
              </span>
            )}
            <span className={styles.headerMetaItem}>
              <Clock size={14} aria-hidden />
              {formatRelative(audit.created_at)}
            </span>
          </div>
        </PageHeader>
      </section>

      {isCompleted && scores.length > 0 && (
        <div className={styles.scoreGrid}>
          {scores.map((s) => (
            <div key={s.label} className={styles.scoreCard}>
              <span className={styles.scoreValue}>{s.value}</span>
              <span className={styles.scoreLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {isCompleted && technologies.length > 0 && (
        <section className={styles.section} aria-labelledby="tech">
          <h2 id="tech" className={styles.sectionTitle}>
            Technologies
          </h2>
          <div className={styles.techList}>
            {technologies.map((tech) => (
              <span key={tech.id} className={styles.techTag}>
                {tech.name}
                <span className={styles.techConfidence}>
                  {Math.round(tech.confidence * 100)}%
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {isCompleted && pages.length > 0 && (
        <section className={styles.section} aria-labelledby="pages">
          <h2 id="pages" className={styles.sectionTitle}>
            Pages
          </h2>
          <div className={styles.pageList}>
            {pages.map((page) => (
              <div key={page.id} className={styles.pageItem}>
                <div className={styles.pageText}>
                  <span className={styles.pagePath}>{page.path ?? page.url}</span>
                  {page.title && (
                    <span className={styles.pageTitle}>{page.title}</span>
                  )}
                </div>
                {page.lighthouse_score !== null && (
                  <span className={styles.pageLighthouse}>
                    {page.lighthouse_score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {isCompleted && issues.length > 0 && (
        <section className={styles.section} aria-labelledby="issues">
          <h2 id="issues" className={styles.sectionTitle}>
            Issues
          </h2>
          <div className={styles.issueList}>
            {issues.map((issue) => {
              const sev = SEVERITY_META[issue.severity] ?? {
                label: issue.severity,
                tone: "muted" as const,
              };
              return (
                <div key={issue.id} className={styles.issueCard}>
                  <div className={styles.issueTop}>
                    <StatusBadge label={sev.label} tone={sev.tone} />
                    <span className={styles.issueTitle}>{issue.title}</span>
                  </div>
                  <p className={styles.issueDescription}>{issue.description}</p>
                  {issue.evidence && (
                    <p className={styles.issueEvidence}>{issue.evidence}</p>
                  )}
                  {issue.recommendation && (
                    <p className={styles.issueRecommendation}>
                      {issue.recommendation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isCompleted && opportunities.length > 0 && (
        <section className={styles.section} aria-labelledby="opportunities">
          <h2 id="opportunities" className={styles.sectionTitle}>
            Opportunities
          </h2>
          <div className={styles.opportunityList}>
            {opportunities.map((opp) => {
              const cat = OPP_CATEGORY_META[opp.category] ?? {
                label: opp.category,
              };
              return (
                <div key={opp.id} className={styles.oppCard}>
                  <div className={styles.oppTop}>
                    <span className={styles.oppTitle}>{opp.title}</span>
                    {opp.score !== null && (
                      <span className={styles.oppScore}>{opp.score}</span>
                    )}
                  </div>
                  <p className={styles.oppSignal}>{opp.observed_signal}</p>
                  <div className={styles.oppMeta}>
                    <StatusBadge label={cat.label} tone="info" />
                    <span className={styles.oppMetaItem}>
                      Impact: {opp.business_impact}
                    </span>
                    <span className={styles.oppMetaItem}>
                      Automation: {opp.automation_potential}
                    </span>
                    <span className={styles.oppMetaItem}>
                      Complexity: {opp.estimated_complexity}
                    </span>
                    {opp.recommended_tools.length > 0 && (
                      <span className={styles.oppMetaItem}>
                        Tools: {opp.recommended_tools.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isCompleted && opportunities.length > 0 && (
        <section className={styles.section} aria-labelledby="pitch">
          <h2 id="pitch" className={styles.sectionTitle}>
            Generate Pitch
          </h2>
          <div className={styles.pitchSection}>
            <PitchButton
              auditId={audit.id}
              opportunityIds={opportunities.map((o) => o.id)}
            />
          </div>
        </section>
      )}

      {audit.status === "failed" && (
        <section className={styles.section}>
          <ErrorState
            title="Audit failed"
            message={
              audit.error_message ?? "The audit could not be completed. Try again later."
            }
          />
        </section>
      )}

      {isInProgress && (
        <section className={styles.section}>
          <div className={styles.pitchSection}>
            <div className={styles.inProgress}>
              <BarChart3 size={20} className={styles.scoreValue} aria-hidden />
              <div>
                <p className={styles.issueTitle}>Audit in progress</p>
                <p className={styles.issueDescription}>
                  Status: {status.label}. This page auto-refreshes as the audit
                  progresses.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

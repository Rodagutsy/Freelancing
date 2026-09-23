import Link from "next/link";
import { ArrowRight, Clock, Globe, MapPin, BarChart3 } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import type { AuditRow } from "@/lib/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import styles from "./AuditCard.module.css";

const STATUS_META: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }> = {
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

export function AuditCard({ audit }: { audit: AuditRow }) {
  const status = STATUS_META[audit.status] ?? { label: audit.status, tone: "muted" as const };

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <StatusBadge label={status.label} tone={status.tone} />
        {audit.overall_score !== null && (
          <div className={styles.score}>
            <BarChart3 size={14} aria-hidden />
            <span>{audit.overall_score}</span>
          </div>
        )}
      </div>

      <h3 className={styles.title}>
        <Link href={`/audits/${audit.id}`} className={styles.titleLink}>
          {audit.business_name ?? audit.url}
        </Link>
      </h3>

      <p className={styles.url}>
        <Globe size={12} aria-hidden />
        {audit.url}
      </p>

      <div className={styles.meta}>
        {audit.industry && (
          <span className={styles.metaItem}>{audit.industry}</span>
        )}
        {audit.location && (
          <span className={styles.metaItem}>
            <MapPin size={12} aria-hidden />
            {audit.location}
          </span>
        )}
        <span className={styles.metaItem}>
          <Clock size={12} aria-hidden />
          {formatRelative(audit.created_at)}
        </span>
      </div>

      <div className={styles.footer}>
        <Link href={`/audits/${audit.id}`} className={styles.action}>
          {audit.status === "completed" ? "View report" : "View progress"}
          <ArrowRight className={styles.actionIcon} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

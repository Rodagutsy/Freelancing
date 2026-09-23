import Link from "next/link";
import { ArrowRight, Building2, Globe, Mail, Clock } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import type { OutboundFeedRow } from "@/lib/types";
import { OUTBOUND_STATUS_META } from "@/lib/constants";
import { StatusBadge } from "@/components/common/StatusBadge";
import styles from "./OutboundCard.module.css";

export function OutboundCard({ outbound }: { outbound: OutboundFeedRow }) {
  const meta = OUTBOUND_STATUS_META[outbound.status];

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <StatusBadge label={meta.label} tone={meta.tone} />
        <span className={styles.steps}>
          {outbound.steps.length} email{outbound.steps.length === 1 ? "" : "s"}
        </span>
      </div>

      <h3 className={styles.title}>
        <Link href={`/outbounds/${outbound.id}`} className={styles.titleLink}>
          {outbound.company_name}
        </Link>
      </h3>

      <div className={styles.meta}>
        {outbound.industry && (
          <span className={styles.metaItem}>
            <Building2 size={12} aria-hidden />
            {outbound.industry}
          </span>
        )}
        {outbound.contact_email && (
          <span className={styles.metaItem}>
            <Mail size={12} aria-hidden />
            {outbound.contact_email}
          </span>
        )}
        {outbound.website_score != null && (
          <span className={styles.metaItem}>
            <Globe size={12} aria-hidden />
            Score {outbound.website_score}/100
          </span>
        )}
        <span className={styles.metaItem}>
          <Clock size={12} aria-hidden />
          {formatRelative(outbound.created_at)}
        </span>
      </div>

      {outbound.personalization_angle && (
        <p className={styles.angle}>{outbound.personalization_angle}</p>
      )}

      <div className={styles.footer}>
        <Link href={`/outbounds/${outbound.id}`} className={styles.action}>
          Review sequence
          <ArrowRight className={styles.actionIcon} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
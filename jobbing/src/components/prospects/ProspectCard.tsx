import Link from "next/link";
import {
  ArrowRight,
  Globe,
  MapPin,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { formatRelative } from "@/lib/utils";
import type { ProspectRow } from "@/lib/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import styles from "./ProspectCard.module.css";

const PIPELINE_META: Record<
  string,
  {
    label: string;
    tone: "success" | "warning" | "danger" | "info" | "muted";
  }
> = {
  prospecting: { label: "Prospecting", tone: "muted" },
  contacted: { label: "Contacted", tone: "info" },
  proposal_sent: { label: "Proposal Sent", tone: "warning" },
  negotiating: { label: "Negotiating", tone: "warning" },
  won: { label: "Won", tone: "success" },
  lost: { label: "Lost", tone: "danger" },
};

export function ProspectCard({ prospect }: { prospect: ProspectRow }) {
  const pipeline =
    PIPELINE_META[prospect.pipeline_status] ?? {
      label: prospect.pipeline_status,
      tone: "muted" as const,
    };

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <StatusBadge label={pipeline.label} tone={pipeline.tone} />
        {prospect.source && (
          <span className={styles.source}>{prospect.source}</span>
        )}
      </div>

      <h3 className={styles.title}>
        <Link href={`/prospects/${prospect.id}`} className={styles.titleLink}>
          {prospect.company_name}
        </Link>
      </h3>

      <div className={styles.meta}>
        {prospect.website_url && (
          <span className={styles.metaItem}>
            <Globe size={12} aria-hidden />
            {prospect.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </span>
        )}
        {prospect.location && (
          <span className={styles.metaItem}>
            <MapPin size={12} aria-hidden />
            {prospect.location}
          </span>
        )}
        {prospect.contact_email && (
          <span className={styles.metaItem}>
            <Mail size={12} aria-hidden />
            {prospect.contact_email}
          </span>
        )}
        {prospect.contact_phone && (
          <span className={styles.metaItem}>
            <Phone size={12} aria-hidden />
            {prospect.contact_phone}
          </span>
        )}
        <span className={styles.metaItem}>
          <Clock size={12} aria-hidden />
          {formatRelative(prospect.created_at)}
        </span>
      </div>

      {prospect.contact_name && (
        <p className={styles.contact}>Contact: {prospect.contact_name}</p>
      )}

      {prospect.notes && (
        <p className={styles.notes}>{prospect.notes}</p>
      )}

      <div className={styles.footer}>
        <Link href={`/prospects/${prospect.id}`} className={styles.action}>
          View details
          <ArrowRight className={styles.actionIcon} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

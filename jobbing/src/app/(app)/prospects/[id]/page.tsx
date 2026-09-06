import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Globe,
  MapPin,
  Mail,
  Phone,
  Clock,
  Briefcase,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProspect, getProspectAudits } from "@/lib/services/prospects";
import { getAudit } from "@/lib/services/audits";
import { formatRelative } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const PIPELINE_META: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  prospecting: { label: "Prospecting", tone: "muted" },
  contacted: { label: "Contacted", tone: "info" },
  proposal_sent: { label: "Proposal Sent", tone: "warning" },
  negotiating: { label: "Negotiating", tone: "warning" },
  won: { label: "Won", tone: "success" },
  lost: { label: "Lost", tone: "danger" },
};

interface ProspectDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProspectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const prospect = await getProspect(supabase, id);
  return {
    title: prospect?.company_name ?? "Prospect",
  };
}

export default async function ProspectDetailPage({
  params,
}: ProspectDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const prospect = await getProspect(supabase, id);
  if (!prospect) notFound();

  const pipeline =
    PIPELINE_META[prospect.pipeline_status] ?? {
      label: prospect.pipeline_status,
      tone: "muted" as const,
    };

  const auditLinks = await getProspectAudits(supabase, prospect.id);

  const audits = await Promise.all(
    auditLinks.map(async (link) => {
      const audit = await getAudit(supabase, link.audit_id);
      return { ...link, audit };
    }),
  );

  return (
    <div>
      <PageHeader
        title={prospect.company_name}
        description={prospect.industry ?? undefined}
        action={
          <StatusBadge label={pipeline.label} tone={pipeline.tone} />
        }
      >
        <div className={styles.headerMeta}>
          {prospect.location && (
            <span className={styles.headerMetaItem}>
              <MapPin size={14} aria-hidden />
              {prospect.location}
            </span>
          )}
          <span className={styles.headerMetaItem}>
            <Clock size={14} aria-hidden />
            {formatRelative(prospect.created_at)}
          </span>
        </div>
      </PageHeader>

      <section className={styles.section} aria-labelledby="contact-heading">
        <h2 id="contact-heading" className={styles.sectionTitle}>
          Contact
        </h2>
        <div className={styles.contactGrid}>
          {prospect.website_url && (
            <div className={styles.contactItem}>
              <Globe size={16} aria-hidden />
              <a
                href={prospect.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactLink}
              >
                {prospect.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </div>
          )}
          {prospect.contact_name && (
            <div className={styles.contactItem}>
              <Briefcase size={16} aria-hidden />
              <span>{prospect.contact_name}</span>
            </div>
          )}
          {prospect.contact_email && (
            <div className={styles.contactItem}>
              <Mail size={16} aria-hidden />
              <a href={`mailto:${prospect.contact_email}`} className={styles.contactLink}>
                {prospect.contact_email}
              </a>
            </div>
          )}
          {prospect.contact_phone && (
            <div className={styles.contactItem}>
              <Phone size={16} aria-hidden />
              <a href={`tel:${prospect.contact_phone}`} className={styles.contactLink}>
                {prospect.contact_phone}
              </a>
            </div>
          )}
          {prospect.source && (
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Source:</span>
              <span>{prospect.source}</span>
            </div>
          )}
        </div>
      </section>

      {prospect.notes && (
        <section className={styles.section} aria-labelledby="notes-heading">
          <h2 id="notes-heading" className={styles.sectionTitle}>
            Notes
          </h2>
          <p className={styles.notes}>{prospect.notes}</p>
        </section>
      )}

      {audits.length > 0 && (
        <section className={styles.section} aria-labelledby="audits-heading">
          <h2 id="audits-heading" className={styles.sectionTitle}>
            Linked Audits
          </h2>
          <div className={styles.auditList}>
            {audits.map((item) => {
              if (!item.audit) return null;
              return (
                <a
                  key={item.audit_id}
                  href={`/audits/${item.audit_id}`}
                  className={styles.auditLink}
                >
                  <span className={styles.auditName}>
                    {item.audit.business_name ?? item.audit.url}
                  </span>
                  <StatusBadge
                    label={item.is_primary ? "Primary" : "Linked"}
                    tone={item.is_primary ? "success" : "muted"}
                  />
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listSuppressedContacts } from "@/lib/services/outreach";
import { formatRelative } from "@/lib/utils";
import { SUPPRESSION_REASON_META } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AddSuppressionForm } from "@/components/outbounds/AddSuppressionForm";
import { RemoveSuppressionButton } from "@/components/outbounds/RemoveSuppressionButton";
import { EmptyState } from "@/components/common/EmptyState";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface SuppressedPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SuppressedPage({
  searchParams,
}: SuppressedPageProps) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
  }

  const supabase = await createClient();
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);

  const result = await listSuppressedContacts(supabase, {
    limit: 15,
    offset: (page - 1) * 15,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / 15));
  const clampedPage = Math.min(page, pageCount);
  const items = clampedPage === page ? result.items : [];

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/outbounds/suppressed?${qs}` : "/outbounds/suppressed";
  };

  return (
    <div>
      <PageHeader
        title="Blocklist"
        description="Contacts that must never be emailed."
      />

      <section className={styles.section} aria-labelledby="add-heading">
        <h2 id="add-heading" className={styles.sectionTitle}>
          Block a contact
        </h2>
        <AddSuppressionForm />
      </section>

      <section className={styles.section} aria-labelledby="list-heading">
        <div className={styles.listHead}>
          <h2 id="list-heading" className={styles.sectionTitle}>
            Suppressed contacts ({result.total})
          </h2>
        </div>

        {items.length > 0 ? (
          <>
            <ul className={styles.list}>
              {items.map((contact) => {
                const meta = SUPPRESSION_REASON_META[contact.reason];
                return (
                  <li key={contact.id} className={styles.contact}>
                    <div className={styles.contactBody}>
                      <div className={styles.contactHead}>
                        <span className={styles.email}>{contact.email}</span>
                        <StatusBadge label={meta.label} tone={meta.tone} />
                      </div>
                      <p className={styles.contactMeta}>
                        Blocked {formatRelative(contact.created_at)}
                        {contact.source_outbound_id && (
                          <>
                            {" · "}
                            <Link
                              href={`/outbounds/${contact.source_outbound_id}`}
                              className={styles.link}
                            >
                              source campaign
                            </Link>
                          </>
                        )}
                      </p>
                      {contact.note && (
                        <p className={styles.note}>{contact.note}</p>
                      )}
                    </div>
                    <RemoveSuppressionButton
                      suppressedId={contact.id}
                      email={contact.email}
                    />
                  </li>
                );
              })}
            </ul>

            {pageCount > 1 && (
              <nav className={styles.pagination} aria-label="Blocklist pagination">
                <Link
                  href={pageHref(clampedPage - 1)}
                  className={styles.pageLink}
                  aria-disabled={clampedPage <= 1}
                  tabIndex={clampedPage <= 1 ? -1 : undefined}
                >
                  <ChevronLeft className={styles.pageIcon} aria-hidden />
                  Previous
                </Link>
                <span className={styles.pageInfo}>
                  Page {clampedPage} of {pageCount}
                </span>
                <Link
                  href={pageHref(clampedPage + 1)}
                  className={styles.pageLink}
                  aria-disabled={clampedPage >= pageCount}
                  tabIndex={clampedPage >= pageCount ? -1 : undefined}
                >
                  Next
                  <ChevronRight className={styles.pageIcon} aria-hidden />
                </Link>
              </nav>
            )}
          </>
        ) : (
          <EmptyState
            title="No one on the blocklist"
            description="Contacts block themselves by unsubscribing, or you can add them manually above."
          />
        )}
      </section>
    </div>
  );
}
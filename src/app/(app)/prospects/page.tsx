import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listProspects, getProspectStats } from "@/lib/services/prospects";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProspectCard } from "@/components/prospects/ProspectCard";
import { ProspectAddButton } from "@/components/prospects/ProspectButtons";
import { EmptyState } from "@/components/common/EmptyState";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ProspectsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProspectsPage({
  searchParams,
}: ProspectsPageProps) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
  }

  const supabase = await createClient();
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const status = (params.get("status") as never) ?? undefined;

  const result = await listProspects(supabase, {
    status,
    limit: 12,
    offset: (page - 1) * 12,
  });
  const stats = await getProspectStats(supabase);
  const pageCount = Math.max(1, Math.ceil(result.total / 12));
  const clampedPage = Math.min(page, pageCount);
  const items = clampedPage === page ? result.items : [];

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/prospects?${qs}` : "/prospects";
  };

  return (
    <div>
      <PageHeader
        title="Prospects"
        description="Businesses you're targeting and the audits behind them."
        action={<ProspectAddButton />}
      />

      <div className={styles.toolbar}>
        <p className={styles.count}>
          {result.total} prospect{result.total === 1 ? "" : "s"}
          {stats.total > 0 && (
            <>
              {" "}
              — {stats.byStatus.won ?? 0} won, {stats.byStatus.lost ?? 0} lost
            </>
          )}
        </p>
      </div>

      {items.length > 0 ? (
        <>
          <div className={styles.prospectList}>
            {items.map((prospect) => (
              <ProspectCard key={prospect.id} prospect={prospect} />
            ))}
          </div>

          {pageCount > 1 && (
            <nav
              className={styles.pagination}
              aria-label="Prospects pagination"
            >
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
          title="No prospects yet"
          description="Add businesses you want to target with personalized automation pitches."
        />
      )}
    </div>
  );
}

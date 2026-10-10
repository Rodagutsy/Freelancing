import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listOutboundFeed } from "@/lib/services/outreach";
import { getDefaultProfile, getProfiles } from "@/lib/services/settings";
import { OUTBOUND_STATUS_META } from "@/lib/constants";
import type { OutboundStatus } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { OutboundCard } from "@/components/outbounds/OutboundCard";
import { OutboundStatusFilter } from "@/components/outbounds/OutboundStatusFilter";
import { CoverLetterLauncher } from "@/components/outbounds/CoverLetterLauncher";
import { EmptyState } from "@/components/common/EmptyState";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface OutboundsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OutboundsPage({
  searchParams,
}: OutboundsPageProps) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
  }

  const supabase = await createClient();
  const [profiles, defaultProfile] = await Promise.all([
    getProfiles(supabase),
    getDefaultProfile(supabase),
  ]);
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const rawStatus = params.get("status") ?? undefined;
  const status = (rawStatus && rawStatus in OUTBOUND_STATUS_META
    ? rawStatus
    : undefined) as OutboundStatus | undefined;

  const result = await listOutboundFeed(supabase, {
    status,
    limit: 12,
    offset: (page - 1) * 12,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / 12));
  const clampedPage = Math.min(page, pageCount);
  const items = clampedPage === page ? result.items : [];

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/outbounds?${qs}` : "/outbounds";
  };

  return (
    <div>
      <PageHeader
        title="Outreach"
        description="AI-drafted sequences to review before anything sends."
      />

      <div className={styles.toolbar}>
        <p className={styles.count}>
          {result.total} campaign{result.total === 1 ? "" : "s"}
        </p>
        <div className={styles.toolbarActions}>
          <Link href="/outbounds/suppressed" className={styles.blocklistLink}>
            Blocklist
          </Link>
          <OutboundStatusFilter value={status ?? null} />
          <CoverLetterLauncher
            profiles={profiles}
            defaultPersonaId={defaultProfile?.id ?? null}
          />
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <div className={styles.list}>
            {items.map((outbound) => (
              <OutboundCard key={outbound.id} outbound={outbound} />
            ))}
          </div>

          {pageCount > 1 && (
            <nav className={styles.pagination} aria-label="Outreach pagination">
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
          title="No outreach campaigns yet"
          description="Open a prospect with a completed audit and draft a personalized email sequence."
        />
      )}
    </div>
  );
}
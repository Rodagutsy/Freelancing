import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listJobs } from "@/lib/services/jobs";
import { getProfiles } from "@/lib/services/settings";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/jobs/FilterBar";
import { AddJobButton } from "@/components/jobs/AddJobButton";
import { BackfillScoresButton } from "@/components/jobs/BackfillScoresButton";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/common/Button";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface JobsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
  }

  const supabase = await createClient();
  const profiles = await getProfiles(supabase);

  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const status = (params.get("status") as "apply" | "review" | "skip" | "all") ?? "all";
  const scoreParam = params.get("score");
  const postedParam = params.get("posted");
  // Explicit score wins; otherwise the default 7–10 band only applies to the
  // unfiltered view so the status (Apply/Review/Skip) filter is not overridden.
  const scoreMin = scoreParam !== null ? Number(scoreParam) : status === "all" ? 7 : undefined;
  const scoreMax = scoreParam !== null ? 10 : status === "all" ? 10 : undefined;
  const result = await listJobs(supabase, {
    scoreMin,
    scoreMax,
    postedHours: postedParam !== null ? Number(postedParam) : 24,
    budgetMin: params.get("budget") ? Number(params.get("budget")) : undefined,
    clientRating: params.get("rating")
      ? Number(params.get("rating"))
      : undefined,
    skills: params.get("skills")
      ? params
          .get("skills")!
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    status,
    profileId: params.get("profileId") ?? undefined,
    page,
    limit: 12,
    sort: "score_desc",
  });

  const clampedPage = Math.min(result.page, result.pageCount);
  const items = clampedPage === result.page ? result.items : [];

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  };

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Fit-scored jobs from your saved searches and watched boards."
      />

      <FilterBar
        searchParams={Object.fromEntries(params.entries())}
        profiles={profiles.map((p) => ({ id: p.id, label: p.label }))}
      />

      <div className={styles.toolbar}>
        <p className={styles.count}>
          {result.total} job{result.total === 1 ? "" : "s"}
        </p>
        <div className={styles.toolbarActions}>
          <BackfillScoresButton />
          <AddJobButton />
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <div className={styles.jobList}>
            {items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {result.pageCount > 1 && (
            <nav className={styles.pagination} aria-label="Jobs pagination">
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
                Page {clampedPage} of {result.pageCount}
              </span>
              <Link
                href={pageHref(clampedPage + 1)}
                className={styles.pageLink}
                aria-disabled={clampedPage >= result.pageCount}
                tabIndex={clampedPage >= result.pageCount ? -1 : undefined}
              >
                Next
                <ChevronRight className={styles.pageIcon} aria-hidden />
              </Link>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          title="No jobs match your filters"
          description="Try widening the score, posted window, or budget range — or add a job you're looking at on Upwork right now."
          action={
            <>
              <Link href="/jobs">
                <Button variant="secondary">Clear filters</Button>
              </Link>
              <AddJobButton align="start" />
            </>
          }
        />
      )}
    </div>
  );
}
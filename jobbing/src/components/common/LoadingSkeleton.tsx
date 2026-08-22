import { cn } from "@/lib/utils";
import styles from "./LoadingSkeleton.module.css";

export function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return <div aria-hidden className={cn(styles.block, className)} />;
}

interface JobListSkeletonProps {
  count?: number;
}

export function JobListSkeleton({ count = 4 }: JobListSkeletonProps) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.cardTop}>
            <SkeletonBlock className={styles.badge} />
            <SkeletonBlock className={styles.score} />
          </div>
          <SkeletonBlock className={styles.title} />
          <SkeletonBlock className={styles.line} />
          <SkeletonBlock className={styles.lineShort} />
          <div className={styles.cardFooter}>
            <SkeletonBlock className={styles.chip} />
            <SkeletonBlock className={styles.chip} />
            <SkeletonBlock className={styles.chip} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className={styles.page}>
      <SkeletonBlock className={styles.pageTitle} />
      <SkeletonBlock className={styles.pageLine} />
      <div className={styles.metrics}>
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className={styles.metric} />
        ))}
      </div>
      <JobListSkeleton />
    </div>
  );
}
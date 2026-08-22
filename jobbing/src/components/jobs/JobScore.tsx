import { cn } from "@/lib/utils";
import styles from "./JobScore.module.css";

interface JobScoreProps {
  score: number | null;
  size?: "sm" | "lg";
  className?: string;
}

export function JobScore({ score, size = "lg", className }: JobScoreProps) {
  const formatted = score === null ? "—" : score.toFixed(1);

  return (
    <div
      className={cn(styles.score, size === "sm" && styles.sm, className)}
      aria-label={score === null ? "No score yet" : `Score ${score.toFixed(1)} out of 10`}
    >
      <span className={styles.value}>{formatted}</span>
      <span className={styles.max} aria-hidden>
        /10
      </span>
    </div>
  );
}
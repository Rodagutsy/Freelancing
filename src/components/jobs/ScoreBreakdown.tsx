import { SCORE_FACTORS } from "@/lib/constants";
import type { ScoreFactor } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./ScoreBreakdown.module.css";

interface ScoreBreakdownProps {
  factors: ScoreFactor | null;
  className?: string;
}

export function ScoreBreakdown({ factors, className }: ScoreBreakdownProps) {
  if (!factors) {
    return <p className={styles.none}>No factor breakdown available.</p>;
  }

  return (
    <div className={cn(styles.list, className)}>
      {SCORE_FACTORS.map((factor) => {
        const value = factors[factor.key] ?? 0;
        const width = `${Math.min(100, Math.max(0, (value / 10) * 100))}%`;
        const isRedFlag = factor.key === "red_flags";

        return (
          <div key={factor.key} className={styles.row}>
            <div className={styles.labelRow}>
              <span className={styles.label}>{factor.label}</span>
              <span className={styles.weight}>{Math.round(factor.weight * 100)}%</span>
            </div>
            <div className={styles.barTrack} role="img" aria-label={`${factor.label}: ${value.toFixed(1)} out of 10`}>
              <div
                className={cn(styles.barFill, isRedFlag && styles.barDanger)}
                style={{ width }}
              />
            </div>
            <span className={styles.value}>{value.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}
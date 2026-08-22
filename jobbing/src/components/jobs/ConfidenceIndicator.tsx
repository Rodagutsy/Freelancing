import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./ConfidenceIndicator.module.css";

interface ConfidenceIndicatorProps {
  confidence: number | null;
  note?: string | null;
  className?: string;
}

export function ConfidenceIndicator({
  confidence,
  note,
  className,
}: ConfidenceIndicatorProps) {
  if (confidence === null) {
    return null;
  }

  const percent = Math.round(confidence * 100);

  return (
    <span className={cn(styles.confidence, className)}>
      <ShieldCheck className={styles.icon} aria-hidden />
      <span>{percent}% confidence</span>
      {note && <span className={styles.note}> — {note}</span>}
    </span>
  );
}
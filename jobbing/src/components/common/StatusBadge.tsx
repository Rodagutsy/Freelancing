import { cn } from "@/lib/utils";
import styles from "./StatusBadge.module.css";

export type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  className?: string;
}

export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span className={cn(styles.badge, styles[tone], className)}>{label}</span>
  );
}
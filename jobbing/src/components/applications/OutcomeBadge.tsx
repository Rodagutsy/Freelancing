import { OUTCOME_META } from "@/lib/constants";
import type { ApplicationOutcome } from "@/lib/types";
import { StatusBadge } from "@/components/common/StatusBadge";

interface OutcomeBadgeProps {
  outcome: ApplicationOutcome;
  className?: string;
}

export function OutcomeBadge({ outcome, className }: OutcomeBadgeProps) {
  const meta = OUTCOME_META[outcome];
  return (
    <StatusBadge label={meta.label} tone={meta.tone} className={className} />
  );
}
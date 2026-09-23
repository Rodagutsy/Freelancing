import { RECOMMENDATION_META } from "@/lib/constants";
import type { Recommendation } from "@/lib/types";
import { StatusBadge } from "@/components/common/StatusBadge";

interface RecommendationBadgeProps {
  recommendation: Recommendation | null;
  className?: string;
}

export function RecommendationBadge({
  recommendation,
  className,
}: RecommendationBadgeProps) {
  if (!recommendation) {
    return <StatusBadge label="Unscored" tone="muted" className={className} />;
  }
  const meta = RECOMMENDATION_META[recommendation];
  return (
    <StatusBadge
      label={meta.label}
      tone={meta.tone}
      className={className}
    />
  );
}
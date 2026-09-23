"use client";

import { OUTCOME_META } from "@/lib/constants";
import type { ApplicationOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./ApplicationStatusSelect.module.css";

interface ApplicationStatusSelectProps {
  value: ApplicationOutcome;
  onChange: (outcome: ApplicationOutcome) => void;
  disabled?: boolean;
}

const OPTIONS: ApplicationOutcome[] = [
  "unknown",
  "viewed",
  "interview",
  "hired",
  "rejected",
];

export function ApplicationStatusSelect({
  value,
  onChange,
  disabled,
}: ApplicationStatusSelectProps) {
  return (
    <label className={styles.wrap}>
      <span className={styles.label}>Outcome</span>
      <select
        className={cn(fieldStyles.select, styles.select)}
        value={value}
        onChange={(event) => onChange(event.target.value as ApplicationOutcome)}
        disabled={disabled}
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {OUTCOME_META[option].label}
          </option>
        ))}
      </select>
    </label>
  );
}
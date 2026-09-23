"use client";

import { useRouter } from "next/navigation";
import { OUTBOUND_STATUS_META } from "@/lib/constants";
import styles from "./OutboundStatusFilter.module.css";

interface OutboundStatusFilterProps {
  value: string | null;
}

export function OutboundStatusFilter({ value }: OutboundStatusFilterProps) {
  const router = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    router.push(next ? `/outbounds?status=${encodeURIComponent(next)}` : "/outbounds");
  }

  return (
    <select
      aria-label="Filter by status"
      value={value ?? ""}
      onChange={handleChange}
      className={styles.select}
    >
      <option value="">All statuses</option>
      {Object.entries(OUTBOUND_STATUS_META).map(([key, meta]) => (
        <option key={key} value={key}>
          {meta.label}
        </option>
      ))}
    </select>
  );
}
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./MetadataRow.module.css";

export interface MetadataItem {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
}

interface MetadataRowProps {
  items: MetadataItem[];
}

export function MetadataRow({ items }: MetadataRowProps) {
  return (
    <dl className={styles.row}>
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className={styles.item}>
          <dt className={styles.label}>
            {Icon && <Icon className={styles.icon} aria-hidden />}
            {label}
          </dt>
          <dd className={styles.value}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
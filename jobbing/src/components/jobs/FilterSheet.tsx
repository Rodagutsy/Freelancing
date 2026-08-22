"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./FilterSheet.module.css";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function FilterSheet({
  open,
  onClose,
  title = "Filters",
  children,
  footer,
}: FilterSheetProps) {
  return (
    <div
      className={cn(styles.backdrop, open && styles.backdropOpen)}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className={cn(styles.sheet, open && styles.sheetOpen)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close filters"
          >
            <X className={styles.closeIcon} aria-hidden />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./ErrorState.module.css";

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={`${styles.state} ${className ?? ""}`} role="alert">
      <div className={styles.header}>
        <CircleAlert className={styles.icon} aria-hidden />
        <h3 className={styles.title}>{title}</h3>
      </div>
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
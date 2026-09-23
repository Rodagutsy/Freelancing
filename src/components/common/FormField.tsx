import { cloneElement, isValidElement, useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./FormField.module.css";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;

  const describedBy =
    [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") ||
    undefined;

  const child =
    isValidElement(children) && describedBy
      ? cloneElement(
          children as React.ReactElement<{
            "aria-describedby"?: string;
            "aria-invalid"?: boolean;
          }>,
          {
            "aria-describedby": describedBy,
            "aria-invalid": error ? true : undefined,
          },
        )
      : children;

  return (
    <div className={cn(styles.field, className)}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
        {required && (
          <span aria-hidden className={styles.required}>
            *
          </span>
        )}
      </label>
      {child}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          <CircleAlert className={styles.errorIcon} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
import { cn } from "@/lib/utils";
import styles from "./SkillTag.module.css";

interface SkillTagProps {
  children: string;
  tone?: "default" | "gold";
  className?: string;
}

export function SkillTag({
  children,
  tone = "default",
  className,
}: SkillTagProps) {
  return (
    <span className={cn(styles.tag, styles[tone], className)}>{children}</span>
  );
}
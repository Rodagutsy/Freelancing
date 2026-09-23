"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Star, X } from "lucide-react";
import { linkAuditToProspectAction, unlinkAuditFromProspectAction } from "@/app/actions";
import { useToast } from "@/components/common/Toast";
import styles from "./ProspectAuditActions.module.css";

interface ProspectAuditActionsProps {
  prospectId: string;
  auditId: string;
  isPrimary: boolean;
  children: ReactNode;
}

export function ProspectAuditActions({
  prospectId,
  auditId,
  isPrimary,
  children,
}: ProspectAuditActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"primary" | "unlink" | null>(null);

  async function makePrimary() {
    setBusy("primary");
    const result = await linkAuditToProspectAction(prospectId, auditId, true);
    setBusy(null);
    if (result.ok) {
      toast("Primary audit updated.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not update the primary audit.", "error");
    }
  }

  async function unlink() {
    setBusy("unlink");
    const result = await unlinkAuditFromProspectAction(prospectId, auditId);
    setBusy(null);
    if (result.ok) {
      toast("Audit unlinked.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not unlink the audit.", "error");
    }
  }

  return (
    <div className={styles.row}>
      <div className={styles.main}>{children}</div>
      {!isPrimary && (
        <button
          type="button"
          className={styles.action}
          onClick={makePrimary}
          disabled={busy !== null}
          aria-label="Make primary audit"
          title="Make primary"
        >
          <Star className={styles.icon} aria-hidden />
        </button>
      )}
      <button
        type="button"
        className={styles.action}
        onClick={unlink}
        disabled={busy !== null}
        aria-label="Unlink audit"
        title="Unlink"
      >
        <X className={styles.icon} aria-hidden />
      </button>
    </div>
  );
}
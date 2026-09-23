"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { linkAuditToProspectAction } from "@/app/actions";
import { FilterSheet } from "@/components/jobs/FilterSheet";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./LinkAuditSheet.module.css";

export interface AvailableAuditOption {
  id: string;
  label: string;
}

interface LinkAuditSheetProps {
  open: boolean;
  onClose: () => void;
  prospectId: string;
  availableAudits: AvailableAuditOption[];
}

export function LinkAuditSheet({
  open,
  onClose,
  prospectId,
  availableAudits,
}: LinkAuditSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleLink(auditId: string) {
    setPendingId(auditId);
    const result = await linkAuditToProspectAction(
      prospectId,
      auditId,
      availableAudits.length === 0,
    );
    setPendingId(null);
    if (result.ok) {
      toast("Audit linked to this prospect.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not link the audit.", "error");
    }
  }

  const unlinked = availableAudits;

  return (
    <FilterSheet
      open={open}
      onClose={onClose}
      title="Link an audit"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      {unlinked.length === 0 ? (
        <p className={styles.empty}>
          No more audits to link. Start a new audit for another website first.
        </p>
      ) : (
        <ul className={styles.list}>
          {unlinked.map((audit) => (
            <li key={audit.id} className={styles.item}>
              <span className={styles.label}>{audit.label}</span>
              <Button
                size="sm"
                loading={pendingId === audit.id}
                onClick={() => handleLink(audit.id)}
              >
                <Plus className={styles.icon} aria-hidden />
                Link
              </Button>
            </li>
          ))}
        </ul>
      )}
    </FilterSheet>
  );
}
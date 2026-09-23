"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAuditAction } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./AuditButtons.module.css";

export function DeleteAuditButton({ auditId }: { auditId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setPending(true);
    const result = await deleteAuditAction(auditId);
    setPending(false);
    if (result.ok) {
      toast("Audit deleted.", "success");
      router.replace("/audits");
      router.refresh();
    } else {
      setConfirming(false);
      toast(result.error ?? "Could not delete the audit.", "error");
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className={styles.destructiveBtn}
      loading={pending}
      onClick={handleDelete}
    >
      <Trash2 className={styles.icon} aria-hidden />
      {confirming ? "Confirm delete" : "Delete"}
    </Button>
  );
}
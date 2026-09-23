"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import type { ProspectRow } from "@/lib/types";
import { ProspectFormSheet } from "@/components/prospects/ProspectFormSheet";
import { LinkAuditSheet } from "@/components/prospects/LinkAuditSheet";
import { deleteProspectAction } from "@/app/actions";
import { useToast } from "@/components/common/Toast";
import styles from "./ProspectButtons.module.css";

export function ProspectAddButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className={styles.icon} aria-hidden />
        Add prospect
      </Button>
      <ProspectFormSheet open={open} onClose={() => setOpen(false)} prospect={null} />
    </>
  );
}

export function ProspectEditButton({ prospect }: { prospect: ProspectRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className={styles.icon} aria-hidden />
        Edit
      </Button>
      <ProspectFormSheet
        open={open}
        onClose={() => setOpen(false)}
        prospect={prospect}
      />
    </>
  );
}

export function ProspectDeleteButton({ prospectId }: { prospectId: string }) {
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
    const result = await deleteProspectAction(prospectId);
    setPending(false);
    if (result.ok) {
      toast("Prospect deleted.", "success");
      router.replace("/prospects");
      router.refresh();
    } else {
      setConfirming(false);
      toast(result.error ?? "Could not delete the prospect.", "error");
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

export function LinkAuditButton({
  prospectId,
  availableAudits,
}: {
  prospectId: string;
  availableAudits: Array<{ id: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Link2 className={styles.icon} aria-hidden />
        Link audit
      </Button>
      <LinkAuditSheet
        open={open}
        onClose={() => setOpen(false)}
        prospectId={prospectId}
        availableAudits={availableAudits}
      />
    </>
  );
}
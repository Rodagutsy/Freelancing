"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePortfolioProjectAction } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";
import styles from "./PortfolioButtons.module.css";

interface DeleteProjectButtonProps {
  projectId: string;
  title: string;
}

export function DeleteProjectButton({
  projectId,
  title,
}: DeleteProjectButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    const result = await deletePortfolioProjectAction(projectId);
    setPending(false);
    if (result.ok) {
      setOpen(false);
      toast("Portfolio project deleted.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not delete the project.", "error");
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${title}`}
      >
        <Trash2 className={styles.icon} aria-hidden />
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        title={`Delete "${title}"?`}
        description="This removes its evidence from future proposal drafts. Proposals that already referenced it will keep their stored text."
        confirmLabel="Delete project"
        tone="danger"
        loading={pending}
        onConfirm={() => void confirm()}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
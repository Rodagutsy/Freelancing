"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeSuppressedContactAction } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";

interface RemoveSuppressionButtonProps {
  suppressedId: string;
  email: string;
}

export function RemoveSuppressionButton({
  suppressedId,
  email,
}: RemoveSuppressionButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      const result = await removeSuppressedContactAction(suppressedId);
      if (result.ok) {
        toast(`Removed ${email} from the blocklist.`, "success");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to remove suppression.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setRemoving(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setConfirming(true)}
        disabled={removing}
      >
        <Trash2 size={16} aria-hidden />
        Remove
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Remove from blocklist?"
        description={`${email} can be contacted again after removal. This does not delete the prospect.`}
        confirmLabel="Remove"
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
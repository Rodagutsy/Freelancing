"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RefreshCw } from "lucide-react";
import {
  approveOutboundAction,
  rejectOutboundAction,
  reviseOutboundAction,
} from "@/app/actions";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";
import styles from "./OutboundActions.module.css";

interface OutboundActionsProps {
  outboundId: string;
  status: string;
}

export function OutboundActions({ outboundId, status }: OutboundActionsProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [revising, setRevising] = useState(false);
  const [instruction, setInstruction] = useState("");

  const canApprove = status === "pitch_drafted" || status === "need_approval";
  const canReject = status === "pitch_drafted" || status === "need_approval" || status === "approved";
  const canRevise = status === "pitch_drafted" || status === "rejected";

  async function handleApprove() {
    setApproving(true);
    try {
      const result = await approveOutboundAction(outboundId);
      if (result.ok) {
        toast("Outbound approved. Ready for the sending pipeline.", "success");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to approve.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      const result = await rejectOutboundAction(outboundId, { note: rejectNote || null });
      if (result.ok) {
        toast("Outbound rejected. Revise and try again.", "success");
        setRejectOpen(false);
        setRejectNote("");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to reject.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setRejecting(false);
    }
  }

  async function handleRevise() {
    if (!instruction.trim()) {
      toast("Describe what to change first.", "info");
      return;
    }
    setRevising(true);
    try {
      const result = await reviseOutboundAction(outboundId, { instruction });
      if (result.ok) {
        toast("Sequence regenerated.", "success");
        setInstruction("");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to revise.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setRevising(false);
    }
  }

  return (
    <div className={styles.container}>
      {canRevise && (
        <form className={styles.reviseForm} onSubmit={(e) => { e.preventDefault(); handleRevise(); }}>
          <label className={styles.reviseLabel} htmlFor="revise-instruction">
            Regenerate with AI
          </label>
          <div className={styles.reviseRow}>
            <input
              id="revise-instruction"
              className={styles.reviseInput}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={status === "rejected" ? "What was wrong? Describe the fix…" : "e.g. Make email 2 shorter and more technical"}
              disabled={revising || approving || rejecting}
            />
            <Button variant="secondary" loading={revising} disabled={!instruction.trim() || approving || rejecting}>
              <RefreshCw size={16} aria-hidden />
              Revise
            </Button>
          </div>
        </form>
      )}

      <div className={styles.actions}>
        {canApprove && (
          <Button onClick={handleApprove} loading={approving} disabled={rejecting || revising}>
            <Check size={16} aria-hidden />
            Approve &amp; mark ready
          </Button>
        )}

        {canReject && (
          <Button
            variant="secondary"
            onClick={() => setRejectOpen(true)}
            disabled={approving || revising}
          >
            <X size={16} aria-hidden />
            Reject
          </Button>
        )}
      </div>

      {rejectOpen && (
        <div className={styles.noteWrap}>
          <label className={styles.reviseLabel} htmlFor="reject-note">
            Reason (for your own revision notes)
          </label>
          <textarea
            id="reject-note"
            className={styles.noteInput}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={2}
            placeholder="Optional — saved in the campaign"
          />
        </div>
      )}

      <ConfirmDialog
        open={rejectOpen}
        title="Reject this sequence?"
        description="It will be saved as rejected so you can revise it. Nothing is sent."
        confirmLabel="Reject"
        tone="danger"
        loading={rejecting}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
      />
    </div>
  );
}
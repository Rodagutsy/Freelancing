"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, Clock } from "lucide-react";
import {
  sendOutboundAction,
  confirmOutboundMessageSentAction,
} from "@/app/actions";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./SendControl.module.css";

interface SendControlProps {
  outboundId: string;
  status: string;
  queuedMessageId: string | null;
  nextStepLabel: string;
}

export function SendControl({
  outboundId,
  status,
  queuedMessageId,
  nextStepLabel,
}: SendControlProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const result = await sendOutboundAction(outboundId);
      if (result.ok) {
        toast("Queued for sending. Next: email delivery.", "success");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to start sending.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleConfirmSent() {
    if (!queuedMessageId) return;
    setConfirming(true);
    try {
      const result = await confirmOutboundMessageSentAction(queuedMessageId);
      if (result.ok) {
        toast("Marked as sent.", "success");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to mark sent.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setConfirming(false);
    }
  }

  if (status === "approved") {
    return (
      <div className={styles.row}>
        <p className={styles.hint}>
          Approve the sequence, then send email 1 of the campaign.
        </p>
        <Button onClick={handleSend} loading={sending} disabled={sending}>
          <Send size={16} aria-hidden />
          Send now
        </Button>
      </div>
    );
  }

  if (status === "sending") {
    return (
      <div className={styles.block}>
        <p className={styles.hint}>
          <Clock size={14} aria-hidden />
          {nextStepLabel} is queued. The n8n sending pipeline picks it up — or
          mark it delivered manually.
        </p>
        <div>
          <Button
            variant="secondary"
            onClick={handleConfirmSent}
            loading={confirming}
            disabled={!queuedMessageId || confirming}
          >
            <CheckCircle2 size={16} aria-hidden />
            Mark as sent
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CalendarClock, CheckCircle2 } from "lucide-react";
import { sendNextFollowUpAction } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./FollowUpControl.module.css";

interface FollowUpControlProps {
  outboundId: string;
  sentCount: number;
  totalSteps: number;
  dueLabel: string | null;
}

export function FollowUpControl({
  outboundId,
  sentCount,
  totalSteps,
  dueLabel,
}: FollowUpControlProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const allSent = sentCount >= totalSteps || totalSteps === 0;
  const nextStepLabel = allSent ? "All emails" : `Email ${sentCount + 1}`;

  async function handleSend() {
    setSending(true);
    try {
      const result = await sendNextFollowUpAction(outboundId);
      if (result.ok) {
        toast(`Queued ${nextStepLabel}.`, "success");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to queue follow-up.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setSending(false);
    }
  }

  if (allSent) {
    return (
      <div className={styles.block}>
        <p className={styles.hint}>
          <CheckCircle2 size={14} aria-hidden />
          {totalSteps} email{totalSteps === 1 ? "" : "s"} sent — campaign
          complete.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.block}>
      <p className={styles.hint}>
        Email {sentCount} of {totalSteps} sent. {nextStepLabel} is next
        {dueLabel ? (
          <>
            {" "}
            <span className={styles.due}>
              <CalendarClock size={14} aria-hidden />
              {dueLabel}
            </span>
          </>
        ) : null}
        .
      </p>
      <div>
        <Button
          variant="primary"
          onClick={handleSend}
          loading={sending}
          disabled={sending}
        >
          <Send size={16} aria-hidden />
          Send follow-up
        </Button>
      </div>
    </div>
  );
}
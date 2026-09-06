"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { draftOutboundAction } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./DraftOutreachButton.module.css";

interface DraftOutreachButtonProps {
  prospectId: string;
  auditIds: string[];
}

export function DraftOutreachButton({
  prospectId,
  auditIds,
}: DraftOutreachButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDraft() {
    setLoading(true);
    try {
      const result = await draftOutboundAction({
        prospectId,
        auditIds,
        primaryAuditId: auditIds[0] ?? null,
      });
      if (result.ok && result.data) {
        toast(
          result.data.source === "ai"
            ? "AI draft ready — review it on the outreach page."
            : "Draft created from template — edit it on the outreach page.",
          "success",
        );
        router.push(`/outbounds/${result.data.outboundId}`);
      } else {
        toast(result.error ?? "Failed to draft outreach.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <Button onClick={handleDraft} loading={loading} disabled={loading}>
        <Sparkles size={16} aria-hidden />
        Draft outreach
      </Button>
    </div>
  );
}
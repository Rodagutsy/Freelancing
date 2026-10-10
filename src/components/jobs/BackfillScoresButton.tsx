"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { backfillScoresAction } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";

/** Scores any jobs that don't yet have a score for every persona. */
export function BackfillScoresButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [running, setRunning] = useState(false);

  async function handleClick() {
    if (running) return;
    setRunning(true);
    const result = await backfillScoresAction();
    setRunning(false);
    if (result.ok && result.data) {
      const { scored, skipped, capped } = result.data;
      if (capped && scored === 0) {
        toast(
          "Weekly AI scoring limit reached. Scoring resumes automatically as the 7-day window frees up.",
          "info",
        );
      } else {
        toast(
          scored === 0
            ? "Every job already has a score for all personas."
            : `Scored ${scored} job${scored === 1 ? "" : "s"} across your personas${skipped ? ` (${skipped} left${capped ? ", weekly limit reached" : " — run again"})` : ""}.`,
          capped ? "info" : "success",
        );
      }
      router.refresh();
    } else {
      toast(result.error ?? "Backfill failed.", "error");
    }
  }

  return (
    <Button
      variant="secondary"
      loading={running}
      onClick={() => void handleClick()}
    >
      <Sparkles size={16} aria-hidden />
      {running ? "Scoring…" : "Score missing"}
    </Button>
  );
}

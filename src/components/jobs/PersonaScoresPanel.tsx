"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles } from "lucide-react";
import { rescoreJobAllPersonasAction } from "@/app/actions";
import type { PersonaScore } from "@/lib/types";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./PersonaScoresPanel.module.css";

interface PersonaScoresPanelProps {
  jobId: string;
  scores: PersonaScore[];
  activeProfileId: string | null;
}

function tone(recommendation: PersonaScore["recommendation"]): string {
  if (recommendation === "APPLY") return styles.apply;
  if (recommendation === "REVIEW") return styles.review;
  return styles.skip;
}

export function PersonaScoresPanel({
  jobId,
  scores,
  activeProfileId,
}: PersonaScoresPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [running, setRunning] = useState(false);

  async function rescoreAll() {
    if (running) return;
    setRunning(true);
    const result = await rescoreJobAllPersonasAction(jobId);
    setRunning(false);
    if (result.ok && result.data) {
      const { count, failures } = result.data;
      toast(
        failures.length > 0
          ? `Scored ${count} persona${count === 1 ? "" : "s"}; ${failures.length} failed (${failures[0].label}).`
          : `Scored against ${count} persona${count === 1 ? "" : "s"}.`,
        failures.length > 0 ? "error" : "success",
      );
      router.refresh();
    } else {
      toast(result.error ?? "Could not re-score this job.", "error");
    }
  }

  return (
    <div className={styles.wrap}>
      {scores.length > 0 ? (
        <ul className={styles.list}>
          {scores.map((score) => (
            <li
              key={score.profile_id}
              className={`${styles.row} ${
                score.profile_id === activeProfileId ? styles.rowActive : ""
              }`}
            >
              <div className={styles.rowMain}>
                <span className={styles.label}>
                  {score.label ?? "Persona"}
                  {score.profile_id === activeProfileId && (
                    <span className={styles.bestTag}>best</span>
                  )}
                </span>
                <span className={`${styles.recommendation} ${tone(score.recommendation)}`}>
                  {score.recommendation}
                </span>
              </div>
              <span className={styles.score}>{Number(score.score_total).toFixed(1)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          This job hasn&apos;t been scored against your personas yet.
        </p>
      )}

      <Button
        variant="secondary"
        size="sm"
        loading={running}
        onClick={() => void rescoreAll()}
      >
        {running ? (
          <RefreshCw className={styles.spinIcon} aria-hidden />
        ) : (
          <Sparkles size={15} aria-hidden />
        )}
        {running ? "Scoring all personas…" : "Re-score all personas"}
      </Button>
    </div>
  );
}

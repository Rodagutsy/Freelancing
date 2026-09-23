"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generatePitchAction } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./PitchButton.module.css";

interface PitchButtonProps {
  auditId: string;
  opportunityIds: string[];
}

export function PitchButton({ auditId, opportunityIds }: PitchButtonProps) {
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState<{
    subjectLine: string;
    pitchText: string;
    keyPoints: string[];
  } | null>(null);
  const { toast } = useToast();

  async function handleGenerate() {
    if (opportunityIds.length === 0) {
      toast("Select at least one opportunity first.", "info");
      return;
    }
    setLoading(true);
    try {
      const result = await generatePitchAction(auditId, opportunityIds);
      if (result.ok && result.data) {
        setPitch(result.data);
      } else {
        toast(result.error ?? "Failed to generate pitch.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <Button
        onClick={handleGenerate}
        loading={loading}
        disabled={loading || opportunityIds.length === 0}
      >
        <Sparkles size={16} aria-hidden />
        Generate Pitch
      </Button>

      {loading && (
        <div className={styles.result}>
          <Loader2 size={20} className={styles.subject} aria-hidden />
          <p className={styles.text}>Generating pitch…</p>
        </div>
      )}

      {!loading && pitch && (
        <div className={styles.result}>
          <p className={styles.subject}>Subject: {pitch.subjectLine}</p>
          <p className={styles.text}>{pitch.pitchText}</p>
          {pitch.keyPoints.length > 0 && (
            <div className={styles.points}>
              {pitch.keyPoints.map((point, i) => (
                <p key={i} className={styles.point}>
                  {point}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

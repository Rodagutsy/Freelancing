"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, RefreshCw, X } from "lucide-react";
import {
  markJobApplied,
  markJobSkipped,
  rescoreJobAction,
  updateApplicationForJob,
} from "@/app/actions";
import type {
  ApplicationOutcome,
  ApplicationRow,
  Recommendation,
} from "@/lib/types";
import { Button } from "@/components/common/Button";
import { JobScore } from "@/components/jobs/JobScore";
import { RecommendationBadge } from "@/components/jobs/RecommendationBadge";
import { ConfidenceIndicator } from "@/components/jobs/ConfidenceIndicator";
import { ApplicationStatusSelect } from "@/components/applications/ApplicationStatusSelect";
import { useToast } from "@/components/common/Toast";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./JobDecisionPanel.module.css";

const SKIP_REASON_CHOICES = [
  "Not a fit",
  "Budget too low",
  "Client issues",
  "Too much competition",
  "Other",
];

interface PersonaOption {
  id: string;
  label: string;
}

interface JobDecisionPanelProps {
  jobId: string;
  jobUrl: string;
  scoreTotal: number | null;
  confidence: number | null;
  recommendation: Recommendation | null;
  latestDraftText: string | null;
  application: ApplicationRow | null;
  skippedAt: string | null;
  skipReason: string | null;
  confidenceNote?: string | null;
  profiles?: PersonaOption[];
  scoredByLabel?: string | null;
}

export function JobDecisionPanel({
  jobId,
  jobUrl,
  scoreTotal,
  confidence,
  recommendation,
  latestDraftText,
  application,
  skippedAt,
  skipReason,
  confidenceNote,
  profiles = [],
  scoredByLabel = null,
}: JobDecisionPanelProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [skipOpen, setSkipOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [rescorePersonaId, setRescorePersonaId] = useState("");
  const [rescoring, setRescoring] = useState(false);

  async function rescore() {
    if (rescoring) return;
    setRescoring(true);
    const result = await rescoreJobAction(jobId, rescorePersonaId || undefined);
    setRescoring(false);
    if (result.ok && result.data) {
      toast(
        `Re-scored: ${result.data.scoreTotal.toFixed(1)} — ${result.data.recommendation}`,
        "success",
      );
      router.refresh();
    } else {
      toast(result.error ?? "Could not re-score this job.", "error");
    }
  }

  async function apply() {
    setPending(true);
    const result = await markJobApplied(jobId);
    setPending(false);
    if (result.ok) {
      toast("Logged as applied.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not mark as applied.", "error");
    }
  }

  async function skip(reason: string) {
    setPending(true);
    const result = await markJobSkipped(jobId, reason);
    setPending(false);
    setSkipOpen(false);
    if (result.ok) {
      toast("Marked as skipped.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not mark as skipped.", "error");
    }
  }

  async function changeOutcome(outcome: ApplicationOutcome) {
    const result = await updateApplicationForJob(jobId, { outcome });
    if (result.ok) {
      toast("Application status updated.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not update status.", "error");
    }
  }

  async function copyProposal() {
    if (!latestDraftText) return;
    try {
      await navigator.clipboard.writeText(latestDraftText);
      toast("Proposal copied to clipboard.", "success");
    } catch {
      toast("Copy failed. Select the text and copy manually.", "error");
    }
  }

  const isSkipped = Boolean(skippedAt);

  return (
    <div className={styles.panel}>
      <div className={styles.scoreRow}>
        <JobScore score={scoreTotal} />
        <RecommendationBadge recommendation={recommendation} />
      </div>

      <ConfidenceIndicator confidence={confidence} note={confidenceNote} />

      {profiles.length > 0 && (
        <div className={styles.rescoreRow}>
          <label className={styles.rescoreLabel} htmlFor="rescore-persona">
            {scoredByLabel
              ? `Scored by ${scoredByLabel}. Re-score with persona`
              : "Re-score with persona"}
          </label>
          <div className={styles.rescoreControls}>
            <select
              id="rescore-persona"
              className={fieldStyles.input}
              value={rescorePersonaId}
              onChange={(event) => setRescorePersonaId(event.target.value)}
              disabled={rescoring}
            >
              <option value="">Default persona</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              loading={rescoring}
              onClick={() => void rescore()}
            >
              {!rescoring && <RefreshCw className={styles.actionIcon} aria-hidden />}
              Re-score
            </Button>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.primary}
        >
          <ExternalLink className={styles.actionIcon} aria-hidden />
          Open job on Upwork
        </a>

        <Button
          variant="secondary"
          onClick={() => void copyProposal()}
          disabled={!latestDraftText}
        >
          <Copy className={styles.actionIcon} aria-hidden />
          Copy proposal
        </Button>
      </div>

      <div className={styles.statusArea}>
        {application ? (
          <ApplicationStatusSelect
            value={application.outcome}
            onChange={(outcome) => void changeOutcome(outcome)}
          />
        ) : isSkipped ? (
          <div className={styles.skipped}>
            <p className={styles.skippedText}>
              Skipped — {skipReason ?? "no reason given"}
            </p>
            <Button
              variant="secondary"
              onClick={() => void apply()}
              loading={pending}
            >
              <Check className={styles.actionIcon} aria-hidden />
              Mark as applied
            </Button>
          </div>
        ) : skipOpen ? (
          <div className={styles.skipChoices} role="group" aria-label="Skip reason">
            <p className={styles.skipPrompt}>Why are you skipping this?</p>
            <div className={styles.skipButtons}>
              {SKIP_REASON_CHOICES.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={styles.skipChip}
                  onClick={() => void skip(reason)}
                  disabled={pending}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Button
              variant="tertiary"
              onClick={() => setSkipOpen(false)}
              disabled={pending}
            >
              <X className={styles.actionIcon} aria-hidden />
              Cancel
            </Button>
          </div>
        ) : (
          <div className={styles.decide}>
            <Button variant="secondary" onClick={() => void apply()} loading={pending}>
              <Check className={styles.actionIcon} aria-hidden />
              Mark as applied
            </Button>
            <Button
              variant="tertiary"
              onClick={() => setSkipOpen(true)}
              disabled={pending}
            >
              Mark as skipped
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
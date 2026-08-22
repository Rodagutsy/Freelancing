"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPOSAL_INSTRUCTIONS } from "@/lib/constants";
import { generateProposalAction } from "@/app/actions";
import { useToast } from "@/components/common/Toast";
import { Button } from "@/components/common/Button";
import styles from "./ProposalEditor.module.css";

interface ProposalEditorProps {
  jobId: string;
  proposal: {
    draft_text: string;
    angle: string;
    version: number;
  } | null;
  canGenerate: boolean;
}

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function ProposalEditor({
  jobId,
  proposal,
  canGenerate,
}: ProposalEditorProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [text, setText] = useState(proposal?.draft_text ?? "");
  const [angle, setAngle] = useState(proposal?.angle ?? "");
  const [version, setVersion] = useState(proposal?.version ?? 0);
  const [pending, setPending] = useState(false);

  const count = wordCount(text);
  const inRange = count >= 150 && count <= 250;
  const canCopy = text.trim().length > 0 && !pending;

  async function run(instruction?: string) {
    if (pending) return;
    setPending(true);
    try {
      const result = await generateProposalAction(jobId, instruction);
      if (!result.ok) {
        toast(result.error ?? "Proposal could not be generated.", "error");
        return;
      }
      if (result.data) {
        setText(result.data.draftText);
        setAngle(result.data.angle);
        setVersion(result.data.version);
      }
      toast("Proposal draft saved.", "success");
      router.refresh();
    } catch {
      toast("Proposal could not be generated. Retry now or review the job manually.", "error");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(text);
      toast("Proposal copied to clipboard.", "success");
    } catch {
      toast("Copy failed. Select the text and copy manually.", "error");
    }
  }

  return (
    <div className={styles.editor}>
      <p className={styles.note}>
        Draft based on the matched evidence below. Review before sending.
      </p>

      <div className={styles.toolbar}>
        <span className={styles.label}>
          {version > 0 ? `Proposal v${version}` : "New proposal"}
        </span>
        <span
          className={cn(styles.count, !inRange && text.trim() && styles.countWarn)}
        >
          {count} words{inRange ? "" : " (target 150–250)"}
        </span>
      </div>

      <textarea
        className={styles.textarea}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="No proposal yet. Generate one to start."
        disabled={pending}
        aria-label="Proposal draft"
        rows={12}
      />

      {angle && (
        <p className={styles.angle}>
          <span className={styles.angleLabel}>Angle:</span> {angle}
        </p>
      )}

      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => void copy()}
          disabled={!canCopy}
        >
          <Copy className={styles.actionIcon} aria-hidden />
          Copy proposal
        </Button>

        {version === 0 ? (
          <Button
            onClick={() => void run()}
            disabled={!canGenerate || pending}
            loading={pending}
          >
            <Sparkles className={styles.actionIcon} aria-hidden />
            {pending ? "Drafting proposal…" : "Generate proposal"}
          </Button>
        ) : (
          <div className={styles.regenerate}>
            <span className={styles.regenerateLabel}>Regenerate:</span>
            {PROPOSAL_INSTRUCTIONS.map((instruction) => (
              <button
                key={instruction}
                type="button"
                className={styles.chip}
                onClick={() => void run(instruction)}
                disabled={pending}
              >
                {pending ? "Drafting proposal…" : instruction}
              </button>
            ))}
            <RefreshCw className={styles.regenerateIcon} aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}
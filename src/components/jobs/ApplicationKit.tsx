"use client";

import { useState } from "react";
import { Copy, Download, FileText, LoaderCircle, Mail, Sparkles } from "lucide-react";
import {
  generateJobCoverLetterAction,
  generateTailoredCvAction,
} from "@/app/actions";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./ApplicationKit.module.css";

interface PersonaOption {
  id: string;
  label: string;
}

interface ApplicationKitProps {
  jobId: string;
  jobTitle: string;
  profiles?: PersonaOption[];
  defaultPersonaId?: string | null;
}

interface DocState {
  text: string;
  angle: string;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "document";
}

export function ApplicationKit({
  jobId,
  jobTitle,
  profiles = [],
  defaultPersonaId = null,
}: ApplicationKitProps) {
  const { toast } = useToast();
  const [personaId, setPersonaId] = useState(defaultPersonaId ?? profiles[0]?.id ?? "");
  const [cv, setCv] = useState<DocState | null>(null);
  const [letter, setLetter] = useState<DocState | null>(null);
  const [cvPending, setCvPending] = useState(false);
  const [letterPending, setLetterPending] = useState(false);

  async function tailorCv() {
    if (cvPending) return;
    setCvPending(true);
    setCv(null);
    const result = await generateTailoredCvAction(jobId, personaId || undefined);
    setCvPending(false);
    if (result.ok && result.data) {
      setCv({ text: result.data.cvText, angle: result.data.angle });
    } else {
      toast(result.error ?? "Could not tailor the CV.", "error");
    }
  }

  async function writeCoverLetter() {
    if (letterPending) return;
    setLetterPending(true);
    setLetter(null);
    const result = await generateJobCoverLetterAction(jobId, personaId || undefined);
    setLetterPending(false);
    if (result.ok && result.data) {
      setLetter({ text: result.data.letterText, angle: result.data.angle });
    } else {
      toast(result.error ?? "Could not write the cover letter.", "error");
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied.`, "success");
    } catch {
      toast("Copy failed. Select the text and copy manually.", "error");
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.note}>
        Generate application material tailored to this job. The tailored CV is
        reorganized from that persona&apos;s master CV (upload one in Settings);
        the cover letter draws on your verified portfolio. Nothing is saved —
        copy or download what you need.
      </p>

      {profiles.length > 0 && (
        <label className={styles.personaLabel} htmlFor="kit-persona">
          Persona
          <select
            id="kit-persona"
            className={fieldStyles.input}
            value={personaId}
            onChange={(event) => setPersonaId(event.target.value)}
            disabled={cvPending || letterPending}
          >
            {profiles.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className={styles.buttons}>
        <Button
          variant="secondary"
          loading={cvPending}
          onClick={() => void tailorCv()}
        >
          <FileText size={16} aria-hidden />
          {cvPending ? "Tailoring CV…" : "Tailor CV"}
        </Button>
        <Button
          variant="secondary"
          loading={letterPending}
          onClick={() => void writeCoverLetter()}
        >
          <Mail size={16} aria-hidden />
          {letterPending ? "Writing…" : "Cover letter"}
        </Button>
      </div>

      {(cvPending || letterPending) && (
        <p className={styles.status} role="status">
          <LoaderCircle className={styles.spinIcon} aria-hidden />
          Asking the AI to draft from your CV and portfolio…
        </p>
      )}

      {cv && (
        <article className={styles.doc}>
          <div className={styles.docHead}>
            <h3 className={styles.docTitle}>
              <Sparkles className={styles.docIcon} aria-hidden />
              Tailored CV
            </h3>
            <span className={styles.angle}>{cv.angle}</span>
          </div>
          <pre className={styles.docText}>{cv.text}</pre>
          <div className={styles.docActions}>
            <Button variant="tertiary" size="sm" onClick={() => void copy(cv.text, "CV")}>
              <Copy size={14} aria-hidden />
              Copy
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => downloadText(`cv-${slug(jobTitle)}.txt`, cv.text)}
            >
              <Download size={14} aria-hidden />
              Download
            </Button>
          </div>
        </article>
      )}

      {letter && (
        <article className={styles.doc}>
          <div className={styles.docHead}>
            <h3 className={styles.docTitle}>
              <Sparkles className={styles.docIcon} aria-hidden />
              Cover letter
            </h3>
            <span className={styles.angle}>{letter.angle}</span>
          </div>
          <p className={styles.letterText}>{letter.text}</p>
          <div className={styles.docActions}>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => void copy(letter.text, "Cover letter")}
            >
              <Copy size={14} aria-hidden />
              Copy
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() =>
                downloadText(`cover-letter-${slug(jobTitle)}.txt`, letter.text)
              }
            >
              <Download size={14} aria-hidden />
              Download
            </Button>
          </div>
        </article>
      )}
    </div>
  );
}

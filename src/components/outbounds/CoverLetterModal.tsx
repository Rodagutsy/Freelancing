"use client";

import { useState, type FormEvent } from "react";
import { Copy, FileText, RefreshCw, Sparkles } from "lucide-react";
import { generateCoverLetterAction } from "@/app/actions";
import { FilterSheet } from "@/components/jobs/FilterSheet";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { useToast } from "@/components/common/Toast";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./CoverLetterModal.module.css";

interface PersonaOption {
  id: string;
  label: string;
}

interface CoverLetterModalProps {
  open: boolean;
  onClose: () => void;
  profiles?: PersonaOption[];
  defaultPersonaId?: string | null;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function CoverLetterModal({
  open,
  onClose,
  profiles = [],
  defaultPersonaId = null,
}: CoverLetterModalProps) {
  const { toast } = useToast();

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [personaId, setPersonaId] = useState(defaultPersonaId ?? "");
  const [letter, setLetter] = useState("");
  const [angle, setAngle] = useState("");
  const [pending, setPending] = useState(false);

  const count = wordCount(letter);
  const inRange = count >= 250 && count <= 400;
  const canSubmit =
    jobTitle.trim().length > 0 && description.trim().length >= 20 && !pending;

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    const result = await generateCoverLetterAction(
      {
        jobTitle: jobTitle.trim(),
        jobDescription: description.trim(),
        companyName: companyName.trim() || undefined,
      },
      personaId || undefined,
    );
    setPending(false);

    if (!result.ok || !result.data) {
      toast(result.error ?? "Cover letter could not be generated.", "error");
      return;
    }
    setLetter(result.data.letterText);
    setAngle(result.data.angle);
    toast("Cover letter drafted — review it below.", "success");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      toast("Cover letter copied.", "success");
    } catch {
      toast("Copy failed. Select the text and copy manually.", "error");
    }
  }

  function clear() {
    setLetter("");
    setAngle("");
  }

  return (
    <FilterSheet
      open={open}
      onClose={onClose}
      title="Cover letter"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Close
          </Button>
          {letter && (
            <>
              <Button variant="tertiary" onClick={clear} disabled={pending}>
                <RefreshCw className={styles.actionIcon} aria-hidden />
                Clear
              </Button>
              <Button variant="secondary" onClick={() => void copy()}>
                <Copy className={styles.actionIcon} aria-hidden />
                Copy
              </Button>
            </>
          )}
          <Button
            form="cover-letter-form"
            type="submit"
            loading={pending}
            className={styles.submit}
          >
            <Sparkles className={styles.actionIcon} aria-hidden />
            {pending ? "Writing…" : letter ? "Rewrite" : "Write letter"}
          </Button>
        </>
      }
    >
      <form
        id="cover-letter-form"
        className={styles.form}
        onSubmit={run}
        noValidate
      >
        <FormField
          label="Job title"
          htmlFor="cover-title"
          hint="For roles found off Upwork — an ATS posting, a referral, a cold application."
          required
        >
          <input
            id="cover-title"
            className={fieldStyles.input}
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            maxLength={200}
            required
          />
        </FormField>

        <FormField label="Company" htmlFor="cover-company">
          <input
            id="cover-company"
            className={fieldStyles.input}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            maxLength={200}
          />
        </FormField>

        <FormField
          label="Job description"
          htmlFor="cover-description"
          hint="Paste the full posting. The letter is written only from claims your portfolio can support."
          required
        >
          <textarea
            id="cover-description"
            className={fieldStyles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={8000}
            rows={10}
            required
          />
        </FormField>

        {profiles.length > 0 && (
          <FormField
            label="Write as persona"
            htmlFor="cover-persona"
          >
            <select
              id="cover-persona"
              className={fieldStyles.input}
              value={personaId}
              onChange={(event) => setPersonaId(event.target.value)}
              disabled={pending}
            >
              {profiles.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.label}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </form>

      {letter && (
        <div className={styles.output}>
          <div className={styles.outputHead}>
            <FileText className={styles.outputIcon} aria-hidden />
            <span className={styles.outputLabel}>
              {count} words{inRange ? "" : " (target 250–400)"}
            </span>
          </div>
          <textarea
            className={fieldStyles.textarea}
            value={letter}
            onChange={(event) => setLetter(event.target.value)}
            rows={16}
            aria-label="Cover letter draft"
          />
          {angle && (
            <p className={styles.angle}>
              <span className={styles.angleLabel}>Angle:</span> {angle}
            </p>
          )}
        </div>
      )}
    </FilterSheet>
  );
}
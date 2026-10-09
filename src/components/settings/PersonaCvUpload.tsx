"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { clearPersonaCvAction, saveProfile } from "@/app/actions";
import type { ProfileRow } from "@/lib/types";
import type { ResumeExtract, ResumeExtractField } from "@/lib/schemas/resume";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import { cn } from "@/lib/utils";
import styles from "./ResumeUpload.module.css";

interface ExtractedField {
  field: ResumeExtractField;
  label: string;
  value: string;
  skipped: boolean;
}

interface ResumeResponse {
  extract: ResumeExtract;
  fields: ExtractedField[];
  saved?: boolean;
}

interface PersonaCvUploadProps {
  profile: ProfileRow;
}

function listValue(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function mergeIntoProfile(
  profile: ProfileRow,
  applied: Map<ResumeExtractField, string>,
): Parameters<typeof saveProfile>[0] {
  const take = (field: ResumeExtractField): string | undefined =>
    applied.get(field);

  const services = take("services");
  const niches = take("niches");

  return {
    label: profile.label,
    name: take("name") ?? profile.name,
    headline: take("headline") ?? profile.headline,
    bio: take("bio") ?? profile.bio ?? null,
    services: services ? listValue(services) : profile.services,
    niches: niches ? listValue(niches) : profile.niches,
    target_rate_min:
      take("target_rate_min") !== undefined
        ? Number(take("target_rate_min"))
        : profile.target_rate_min,
    target_rate_max:
      take("target_rate_max") !== undefined
        ? Number(take("target_rate_max"))
        : profile.target_rate_max,
    behance_url: profile.behance_url,
    pinterest_url: profile.pinterest_url,
    linkedin_url: profile.linkedin_url,
    upwork_profile_url: profile.upwork_profile_url,
    website_url: profile.website_url,
  };
}

/**
 * Per-persona master CV: upload a file, keep its text on the persona, and
 * optionally auto-fill the persona's fields from what the AI extracted.
 */
export function PersonaCvUpload({ profile }: PersonaCvUploadProps) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ExtractedField[] | null>(null);

  function reset() {
    setFields(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload(file: File) {
    setError(null);
    setFields(null);

    const body = new FormData();
    body.append("file", file);
    body.append("personaId", profile.id);

    setParsing(true);
    try {
      const response = await fetch("/api/resume", { method: "POST", body });
      const payload = (await response.json()) as
        | ResumeResponse
        | { error?: string };

      if (!response.ok || !("fields" in payload)) {
        setError(
          ("error" in payload && payload.error) ||
            "Couldn't read that CV. Try again or upload a .txt.",
        );
        return;
      }

      if (payload.saved) {
        toast(`Master CV saved to ${profile.label}.`, "success");
        router.refresh();
      }

      if (payload.fields.length === 0) {
        setError(
          payload.saved
            ? "Master CV saved, but nothing confident enough to auto-fill. Edit the persona manually."
            : "Nothing confident enough to extract. Try a CV with more detail.",
        );
        return;
      }
      setFields(payload.fields.map((f) => ({ ...f, skipped: false })));
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setParsing(false);
    }
  }

  function toggleField(field: ResumeExtractField) {
    setFields((prev) =>
      prev === null
        ? prev
        : prev.map((f) =>
            f.field === field ? { ...f, skipped: !f.skipped } : f,
          ),
    );
  }

  async function apply() {
    if (!fields) return;
    const applied = new Map(
      fields
        .filter((f) => !f.skipped)
        .map((f) => [f.field, f.value] as const),
    );
    applied.delete("skills");

    setApplying(true);
    const result = await saveProfile(mergeIntoProfile(profile, applied), profile.id);
    setApplying(false);

    if (result.ok) {
      toast(`${profile.label} updated from its CV.`, "success");
      reset();
      router.refresh();
    } else {
      setError(result.error ?? "Couldn't save the extracted fields.");
    }
  }

  async function clearCv() {
    setClearing(true);
    const result = await clearPersonaCvAction(profile.id);
    setClearing(false);
    if (result.ok) {
      toast("Master CV removed.", "success");
      reset();
      router.refresh();
    } else {
      toast(result.error ?? "Could not remove the CV.", "error");
    }
  }

  const appliedCount =
    fields?.filter((f) => !f.skipped && f.field !== "skills").length ?? 0;
  const hasCv = Boolean(profile.master_cv_text);

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>
        Upload this persona&apos;s master CV. Its text powers per-job tailored CV
        generation, and the AI can auto-fill the fields below. Review before
        applying — applied values overwrite this persona.
      </p>

      {hasCv && (
        <div className={styles.status}>
          <FileText className={styles.actionIcon} aria-hidden />
          <span>
            Current: <strong>{profile.master_cv_filename ?? "master-cv"}</strong>
          </span>
          <Button
            variant="destructive"
            size="sm"
            loading={clearing}
            onClick={() => void clearCv()}
          >
            <Trash2 className={styles.actionIcon} aria-hidden />
            Remove
          </Button>
        </div>
      )}

      <div
        className={cn(styles.dropzone, dragging && styles.dropzoneActive)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          className={styles.fileInput}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
          aria-label={`Master CV for ${profile.label}`}
        />
        <FileText className={styles.dropIcon} aria-hidden />
        <p className={styles.dropTitle}>
          {hasCv ? "Replace with a new CV" : "Drop a CV here, or choose a file"}
        </p>
        <p className={styles.dropHint}>
          PDF or .txt, up to 2 MB. Scanned image-only PDFs can&apos;t be read.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          loading={parsing}
        >
          <Upload className={styles.actionIcon} aria-hidden />
          {parsing ? "Reading CV…" : "Choose file"}
        </Button>
      </div>

      {parsing && (
        <p className={styles.status} role="status">
          <LoaderCircle className={styles.spinIcon} aria-hidden />
          Uploading and extracting this persona&apos;s details…
        </p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {fields && fields.length > 0 && (
        <div className={styles.preview}>
          <div className={styles.previewHead}>
            <h3 className={styles.previewTitle}>
              We found {fields.length} field{fields.length === 1 ? "" : "s"}
            </h3>
            <p className={styles.previewHint}>
              Untick anything you don&apos;t want, then apply to {profile.label}.
            </p>
          </div>

          <ul className={styles.fieldList}>
            {fields.map((field) => (
              <li key={field.field} className={styles.fieldRow}>
                <label className={styles.fieldToggle}>
                  <input
                    type="checkbox"
                    checked={!field.skipped}
                    onChange={() => toggleField(field.field)}
                  />
                  <span className={styles.fieldLabel}>{field.label}</span>
                </label>
                <span className={styles.fieldValue}>{field.value}</span>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={reset} disabled={applying}>
              <X className={styles.actionIcon} aria-hidden />
              Discard
            </Button>
            <Button
              onClick={() => void apply()}
              loading={applying}
              disabled={appliedCount === 0}
            >
              {applying
                ? "Applying…"
                : `Apply ${appliedCount} field${appliedCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

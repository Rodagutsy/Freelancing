"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addJob, fetchJobFromUrl } from "@/app/actions";
import { useToast } from "@/components/common/Toast";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { FilterSheet } from "@/components/jobs/FilterSheet";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./AddJobButton.module.css";

type ImportStatus = "idle" | "loading" | "done" | "error";

interface AddJobButtonProps {
  align?: "start" | "end";
}

export function AddJobButton({ align = "end" }: AddJobButtonProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [budgetType, setBudgetType] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importMessage, setImportMessage] = useState("");
  const [pending, setPending] = useState(false);

  const lastImported = useRef<string | null>(null);

  const runImport = useCallback(async (value: string) => {
    setImportStatus("loading");
    setImportMessage("");
    const result = await fetchJobFromUrl(value);

    if (result.ok && result.data) {
      const preview = result.data;
      setTitle((prev) => prev || preview.title || "");
      setDescription((prev) => prev || preview.description || "");
      setSkills((prev) => prev || preview.skills?.join(", ") || "");
      setBudgetType((prev) => prev || preview.budget_type || "");
      setBudgetMin((prev) =>
        prev || (preview.budget_min !== undefined ? String(preview.budget_min) : ""),
      );
      setBudgetMax((prev) =>
        prev || (preview.budget_max !== undefined ? String(preview.budget_max) : ""),
      );
      setImportStatus("done");
      setImportMessage(
        "Details imported from Upwork. Check them, then add the job.",
      );
    } else {
      setImportStatus("error");
      setImportMessage(
        result.error ||
          "Couldn't read the job automatically — fill in the details below.",
      );
    }
  }, []);

  useEffect(() => {
    const value = url.trim();
    if (!value || value === lastImported.current) return;
    if (!/^https:\/\/(www\.)?upwork\.com\//i.test(value)) return;

    const timer = setTimeout(() => {
      lastImported.current = value;
      void runImport(value);
    }, 800);
    return () => clearTimeout(timer);
  }, [url, runImport]);

  const reset = () => {
    setUrl("");
    setTitle("");
    setDescription("");
    setSkills("");
    setBudgetType("");
    setBudgetMin("");
    setBudgetMax("");
    setImportStatus("idle");
    setImportMessage("");
    lastImported.current = null;
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);

    const result = await addJob({
      url: url.trim(),
      title: title.trim(),
      description: description.trim(),
      skills: skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      budget_type: budgetType ? (budgetType as "fixed" | "hourly") : undefined,
      budget_min: budgetMin ? Number(budgetMin) : undefined,
      budget_max: budgetMax ? Number(budgetMax) : undefined,
    });

    setPending(false);

    if (!result.ok) {
      toast(result.error || "Could not add the job.", "error");
      return;
    }

    toast("Job added and scored.", "success");
    setOpen(false);
    reset();
    router.push(`/jobs/${result.data?.jobId}`);
  }

  return (
    <div
      className={cn(
        styles.wrap,
        align === "start" ? styles.alignStart : styles.alignEnd,
      )}
    >
      <Button onClick={() => setOpen(true)}>
        <Plus className={styles.icon} aria-hidden />
        Add job
      </Button>

      <FilterSheet
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Add a job"
        footer={
          <Button
            type="submit"
            form="add-job-form"
            loading={pending}
            className={styles.submit}
          >
            Add & score job
          </Button>
        }
      >
        <form
          id="add-job-form"
          className={styles.form}
          onSubmit={onSubmit}
          noValidate
        >
          <FormField
            label="Upwork job link"
            htmlFor="add-url"
            required
            hint="Paste the job's Upwork URL — details auto-fill when possible."
          >
            <input
              id="add-url"
              className={cn(
                fieldStyles.input,
                importStatus === "error" && fieldStyles.hasError,
              )}
              type="url"
              placeholder="https://www.upwork.com/jobs/~..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              autoComplete="off"
            />
          </FormField>

          {importStatus === "loading" && (
            <p className={styles.statusRow} role="status">
              <LoaderCircle
                className={cn(styles.icon, styles.spin)}
                aria-hidden
              />
              Reading the job from Upwork…
            </p>
          )}
          {importStatus === "done" && (
            <p className={cn(styles.statusRow, styles.statusOk)} role="status">
              {importMessage}
            </p>
          )}
          {importStatus === "error" && (
            <p className={cn(styles.statusRow, styles.statusError)} role="alert">
              {importMessage}
            </p>
          )}

          <FormField label="Title" htmlFor="add-title" required>
            <input
              id="add-title"
              className={fieldStyles.input}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </FormField>

          <FormField label="Description" htmlFor="add-description" required>
            <textarea
              id="add-description"
              className={fieldStyles.textarea}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>

          <FormField
            label="Skills"
            htmlFor="add-skills"
            hint="Comma-separated, e.g. n8n, GoHighLevel, API Integration"
          >
            <input
              id="add-skills"
              className={fieldStyles.input}
              type="text"
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
            />
          </FormField>

          <div className={styles.budgetRow}>
            <FormField label="Budget type" htmlFor="add-budget-type">
              <select
                id="add-budget-type"
                className={fieldStyles.select}
                value={budgetType}
                onChange={(event) => setBudgetType(event.target.value)}
              >
                <option value="">Unknown</option>
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
              </select>
            </FormField>

            <FormField label="Min ($)" htmlFor="add-budget-min">
              <input
                id="add-budget-min"
                className={fieldStyles.input}
                type="number"
                min={0}
                inputMode="decimal"
                value={budgetMin}
                onChange={(event) => setBudgetMin(event.target.value)}
              />
            </FormField>

            <FormField label="Max ($)" htmlFor="add-budget-max">
              <input
                id="add-budget-max"
                className={fieldStyles.input}
                type="number"
                min={0}
                inputMode="decimal"
                value={budgetMax}
                onChange={(event) => setBudgetMax(event.target.value)}
              />
            </FormField>
          </div>
        </form>
      </FilterSheet>
    </div>
  );
}
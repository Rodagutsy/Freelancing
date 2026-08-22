"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateApplicationForJob } from "@/app/actions";
import { useToast } from "@/components/common/Toast";
import { Button } from "@/components/common/Button";
import styles from "./NotesEditor.module.css";

interface NotesEditorProps {
  jobId: string;
  hasApplication: boolean;
  initialNotes: string | null;
}

export function NotesEditor({
  jobId,
  hasApplication,
  initialNotes,
}: NotesEditorProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [value, setValue] = useState(initialNotes ?? "");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const result = await updateApplicationForJob(jobId, { notes: value });
    setPending(false);
    if (result.ok) {
      toast("Notes saved.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not save notes.", "error");
    }
  }

  return (
    <div className={styles.wrap}>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={
          hasApplication
            ? "Private notes about this job or client…"
            : "Mark this job as applied to start adding private notes."
        }
        disabled={!hasApplication || pending}
        aria-label="Private notes"
        rows={4}
      />
      <div className={styles.footer}>
        <Button
          variant="secondary"
          onClick={() => void save()}
          disabled={!hasApplication || pending}
        >
          <Save className={styles.icon} aria-hidden />
          Save notes
        </Button>
      </div>
    </div>
  );
}
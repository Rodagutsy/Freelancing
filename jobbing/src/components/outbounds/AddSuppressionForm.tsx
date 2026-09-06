"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";
import { addSuppressedContactAction } from "@/app/actions";
import { SUPPRESSION_REASON_META } from "@/lib/constants";
import type { SuppressionReason } from "@/lib/types";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./AddSuppressionForm.module.css";

export function AddSuppressionForm() {
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<SuppressionReason>("manual");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await addSuppressedContactAction({
        email,
        reason,
        note: note.trim() || null,
      });
      if (result.ok) {
        toast(`${email} added to the blocklist.`, "success");
        setEmail("");
        setNote("");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to add suppression.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.label} htmlFor="suppress-email">
          Email
        </label>
        <input
          id="suppress-email"
          className={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          disabled={submitting}
          required
        />
      </div>

      <div className={styles.row}>
        <label className={styles.label} htmlFor="suppress-reason">
          Reason
        </label>
        <select
          id="suppress-reason"
          className={styles.input}
          value={reason}
          onChange={(e) => setReason(e.target.value as SuppressionReason)}
          disabled={submitting}
        >
          {Object.entries(SUPPRESSION_REASON_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <label className={styles.label} htmlFor="suppress-note">
          Note
        </label>
        <input
          id="suppress-note"
          className={styles.input}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional context"
          disabled={submitting}
        />
      </div>

      <div>
        <Button
          type="submit"
          variant="destructive"
          loading={submitting}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 size={16} className={styles.spin} aria-hidden />
          ) : (
            <Ban size={16} aria-hidden />
          )}
          Block contact
        </Button>
      </div>
    </form>
  );
}
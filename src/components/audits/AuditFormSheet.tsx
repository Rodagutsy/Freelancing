"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { startAuditAction } from "@/app/actions";
import { FilterSheet } from "@/components/jobs/FilterSheet";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { useToast } from "@/components/common/Toast";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./AuditFormSheet.module.css";

interface AuditFormSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AuditFormSheet({ open, onClose }: AuditFormSheetProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    url: "",
    business_name: "",
    industry: "",
    location: "",
  });
  const [pending, setPending] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const url = form.url.trim();
    if (!url) {
      toast("Enter the website URL to audit.", "error");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast("Enter a full URL starting with http:// or https://.", "error");
      return;
    }

    setPending(true);
    const result = await startAuditAction({
      url,
      business_name: form.business_name.trim() || undefined,
      industry: form.industry.trim() || undefined,
      location: form.location.trim() || undefined,
    });
    setPending(false);

    if (result.ok) {
      toast("Audit started — it will run in the background.", "success");
      onClose();
      setForm({ url: "", business_name: "", industry: "", location: "" });
      router.refresh();
    } else {
      toast(result.error ?? "Could not start the audit.", "error");
    }
  }

  return (
    <FilterSheet
      open={open}
      onClose={onClose}
      title="Start a website audit"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            form="audit-form"
            type="submit"
            loading={pending}
            className={styles.submit}
          >
            {pending ? "Starting…" : "Start audit"}
          </Button>
        </>
      }
    >
      <form id="audit-form" className={styles.form} onSubmit={handleSubmit}>
        <FormField
          label="Website URL"
          htmlFor="audit-url"
          hint="The audit crawls the site, detects its stack, and scores UX, performance, SEO and automation opportunities."
          required
        >
          <input
            id="audit-url"
            className={fieldStyles.input}
            type="url"
            placeholder="https://example.com"
            value={form.url}
            onChange={(event) => set("url", event.target.value)}
            autoComplete="off"
            required
          />
        </FormField>

        <FormField label="Business name" htmlFor="audit-name">
          <input
            id="audit-name"
            className={fieldStyles.input}
            value={form.business_name}
            onChange={(event) => set("business_name", event.target.value)}
            autoComplete="off"
          />
        </FormField>

        <div className={styles.row}>
          <FormField label="Industry" htmlFor="audit-industry">
            <input
              id="audit-industry"
              className={fieldStyles.input}
              value={form.industry}
              onChange={(event) => set("industry", event.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Location" htmlFor="audit-location">
            <input
              id="audit-location"
              className={fieldStyles.input}
              value={form.location}
              onChange={(event) => set("location", event.target.value)}
              autoComplete="off"
            />
          </FormField>
        </div>
      </form>
    </FilterSheet>
  );
}
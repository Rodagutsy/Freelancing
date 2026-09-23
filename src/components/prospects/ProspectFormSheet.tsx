"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createProspectAction, updateProspectAction } from "@/app/actions";
import type { ProspectRow } from "@/lib/types";
import { FilterSheet } from "@/components/jobs/FilterSheet";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { useToast } from "@/components/common/Toast";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./ProspectFormSheet.module.css";

interface ProspectFormSheetProps {
  open: boolean;
  onClose: () => void;
  prospect: ProspectRow | null;
}

const CONTACT_TYPE_LABELS: Record<string, string> = {
  corporate: "Corporate",
  sole_trader: "Sole trader",
  individual: "Individual",
};

export function ProspectFormSheet({
  open,
  onClose,
  prospect,
}: ProspectFormSheetProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState(() => ({
    company_name: prospect?.company_name ?? "",
    website_url: prospect?.website_url ?? "",
    industry: prospect?.industry ?? "",
    location: prospect?.location ?? "",
    contact_name: prospect?.contact_name ?? "",
    contact_email: prospect?.contact_email ?? "",
    contact_phone: prospect?.contact_phone ?? "",
    source: prospect?.source ?? "",
    contact_type: prospect?.contact_type ?? ("corporate" as string),
    notes: prospect?.notes ?? "",
  }));
  const [pending, setPending] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const payload = {
      company_name: form.company_name.trim(),
      website_url: form.website_url.trim() || null,
      industry: form.industry.trim() || undefined,
      location: form.location.trim() || undefined,
      contact_name: form.contact_name.trim() || undefined,
      contact_email: form.contact_email.trim() || undefined,
      contact_phone: form.contact_phone.trim() || undefined,
      source: form.source.trim() || undefined,
      contact_type: form.contact_type as "corporate" | "sole_trader" | "individual",
      notes: form.notes.trim() || undefined,
    };

    setPending(true);
    const result = prospect
      ? await updateProspectAction(prospect.id, payload)
      : await createProspectAction(payload);
    setPending(false);

    if (result.ok) {
      toast(
        prospect
          ? "Prospect updated."
          : "Prospect added — link an audit to draft evidence-based outreach.",
        "success",
      );
      onClose();
      router.refresh();
    } else {
      toast(result.error ?? "Could not save the prospect.", "error");
    }
  }

  return (
    <FilterSheet
      open={open}
      onClose={onClose}
      title={prospect ? "Edit prospect" : "Add prospect"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            form="prospect-form"
            type="submit"
            loading={pending}
            className={styles.submit}
          >
            {pending ? "Saving…" : prospect ? "Save changes" : "Add prospect"}
          </Button>
        </>
      }
    >
      <form id="prospect-form" className={styles.form} onSubmit={handleSubmit}>
        <FormField label="Company name" htmlFor="prospect-name" required>
          <input
            id="prospect-name"
            className={fieldStyles.input}
            value={form.company_name}
            onChange={(event) => set("company_name", event.target.value)}
            autoComplete="off"
            required
          />
        </FormField>

        <FormField
          label="Website"
          htmlFor="prospect-website"
          hint="The outreach AI uses this to ground references to the business."
        >
          <input
            id="prospect-website"
            className={fieldStyles.input}
            type="url"
            placeholder="https://example.com"
            value={form.website_url}
            onChange={(event) => set("website_url", event.target.value)}
            autoComplete="off"
          />
        </FormField>

        <div className={styles.row}>
          <FormField label="Industry" htmlFor="prospect-industry">
            <input
              id="prospect-industry"
              className={fieldStyles.input}
              value={form.industry}
              onChange={(event) => set("industry", event.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Location" htmlFor="prospect-location">
            <input
              id="prospect-location"
              className={fieldStyles.input}
              value={form.location}
              onChange={(event) => set("location", event.target.value)}
              autoComplete="off"
            />
          </FormField>
        </div>

        <div className={styles.row}>
          <FormField label="Contact name" htmlFor="prospect-contact-name">
            <input
              id="prospect-contact-name"
              className={fieldStyles.input}
              value={form.contact_name}
              onChange={(event) => set("contact_name", event.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Contact email" htmlFor="prospect-contact-email">
            <input
              id="prospect-contact-email"
              className={fieldStyles.input}
              type="email"
              value={form.contact_email}
              onChange={(event) => set("contact_email", event.target.value)}
              autoComplete="off"
            />
          </FormField>
        </div>

        <div className={styles.row}>
          <FormField label="Contact phone" htmlFor="prospect-phone">
            <input
              id="prospect-phone"
              className={fieldStyles.input}
              value={form.contact_phone}
              onChange={(event) => set("contact_phone", event.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Contact type" htmlFor="prospect-contact-type">
            <select
              id="prospect-contact-type"
              className={fieldStyles.select}
              value={form.contact_type}
              onChange={(event) => set("contact_type", event.target.value)}
            >
              {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Source" htmlFor="prospect-source">
          <input
            id="prospect-source"
            className={fieldStyles.input}
            placeholder="e.g. Job post, referral, cold …"
            value={form.source}
            onChange={(event) => set("source", event.target.value)}
            autoComplete="off"
          />
        </FormField>

        <FormField label="Notes" htmlFor="prospect-notes">
          <textarea
            id="prospect-notes"
            className={fieldStyles.textarea}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
            rows={3}
          />
        </FormField>
      </form>
    </FilterSheet>
  );
}
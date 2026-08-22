"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { fetchPortfolioFromUrl, saveProfile } from "@/app/actions";
import type { ProfileRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { useToast } from "@/components/common/Toast";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./ProfileForm.module.css";

interface ProfileFormProps {
  profile: ProfileRow | null;
}

const LINK_FIELDS = [
  { key: "behance_url", label: "Behance", placeholder: "https://www.behance.net/yourname" },
  { key: "pinterest_url", label: "Pinterest portfolio", placeholder: "https://www.pinterest.com/yourname/board" },
  { key: "linkedin_url", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/yourname" },
  { key: "upwork_profile_url", label: "Upwork profile", placeholder: "https://www.upwork.com/freelancers/~..." },
  { key: "website_url", label: "Website / other", placeholder: "https://..." },
] as const;

type LinkKey = (typeof LINK_FIELDS)[number]["key"];

function detectLinkField(url: string): LinkKey {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "website_url";
  }
  if (host.endsWith("behance.net")) return "behance_url";
  if (host.endsWith("pinterest.com") || host === "pin.it") return "pinterest_url";
  if (host.endsWith("linkedin.com")) return "linkedin_url";
  if (host.endsWith("upwork.com")) return "upwork_profile_url";
  return "website_url";
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: profile?.name ?? "",
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    services: (profile?.services ?? []).join(", "),
    niches: (profile?.niches ?? []).join(", "),
    target_rate_min: profile?.target_rate_min?.toString() ?? "",
    target_rate_max: profile?.target_rate_max?.toString() ?? "",
    behance_url: profile?.behance_url ?? "",
    pinterest_url: profile?.pinterest_url ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
    upwork_profile_url: profile?.upwork_profile_url ?? "",
    website_url: profile?.website_url ?? "",
  });
  const [pending, setPending] = useState(false);

  const [importValue, setImportValue] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImport() {
    const value = importValue.trim();
    if (!value) return;

    setImporting(true);
    setImportMessage("");
    const result = await fetchPortfolioFromUrl(value);
    setImporting(false);

    if (!result.ok || !result.data) {
      setImportMessage(result.error ?? "Couldn't read that page.");
      return;
    }

    const preview = result.data;
    if (preview.kind === "project") {
      setImportMessage(
        "That's a project link — import it from the Portfolio page so it becomes a project entry.",
      );
      return;
    }

    setForm((prev) => {
      const next = { ...prev };
      if (!next.headline && preview.headline) next.headline = preview.headline;
      if (!next.bio && preview.bio) next.bio = preview.bio;

      const importedSkills = preview.skills ?? [];
      if (importedSkills.length) {
        const existing = next.services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const skill of importedSkills) {
          if (!existing.some((s) => s.toLowerCase() === skill.toLowerCase())) {
            existing.push(skill);
          }
        }
        next.services = existing.join(", ");
      }

      const linkKey = detectLinkField(value);
      if (!next[linkKey]) next[linkKey] = value;

      return next;
    });

    setImportMessage(
      "Profile details imported — review them below. Sites like LinkedIn often block reads; anything missing you can paste in yourself.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const result = await saveProfile({
      name: form.name.trim(),
      headline: form.headline.trim(),
      bio: form.bio.trim() || null,
      services: form.services
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      niches: form.niches
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      target_rate_min: form.target_rate_min
        ? Number(form.target_rate_min)
        : null,
      target_rate_max: form.target_rate_max
        ? Number(form.target_rate_max)
        : null,
      behance_url: form.behance_url.trim() || null,
      pinterest_url: form.pinterest_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      upwork_profile_url: form.upwork_profile_url.trim() || null,
      website_url: form.website_url.trim() || null,
    });

    setPending(false);
    if (result.ok) {
      toast("Profile saved.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not save the profile.", "error");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormField
        label="Auto-fill from profile link"
        htmlFor="pf-import"
        hint="Paste your Upwork or LinkedIn profile URL to prefill headline, bio and skills."
      >
        <div className={styles.importRow}>
          <input
            id="pf-import"
            className={cn(fieldStyles.input, styles.importInput)}
            type="url"
            placeholder="https://www.upwork.com/freelancers/~..."
            value={importValue}
            onChange={(event) => setImportValue(event.target.value)}
            autoComplete="off"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleImport}
            loading={importing}
          >
            Auto-fill
          </Button>
        </div>
        {importMessage && (
          <p className={cn(styles.statusRow)} role="status">
            {importMessage}
          </p>
        )}
        {importing && (
          <p className={cn(styles.statusRow)} role="status">
            <LoaderCircle className={styles.spinIcon} aria-hidden />
            Reading your profile…
          </p>
        )}
      </FormField>

      <FormField label="Name" htmlFor="pf-name" required>
        <input
          id="pf-name"
          className={fieldStyles.input}
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
          required
        />
      </FormField>

      <FormField
        label="Headline"
        htmlFor="pf-headline"
        hint="Shown to the scoring AI. e.g. Business Automation Developer | AI Workflow | n8n | GoHighLevel | APIs"
      >
        <input
          id="pf-headline"
          className={fieldStyles.input}
          value={form.headline}
          onChange={(event) => set("headline", event.target.value)}
        />
      </FormField>

      <FormField
        label="Bio"
        htmlFor="pf-bio"
        hint="Short background the proposal AI may draw on."
      >
        <textarea
          id="pf-bio"
          className={fieldStyles.textarea}
          value={form.bio}
          onChange={(event) => set("bio", event.target.value)}
          rows={4}
        />
      </FormField>

      <FormField
        label="Services"
        htmlFor="pf-services"
        hint="Comma-separated"
      >
        <input
          id="pf-services"
          className={fieldStyles.input}
          value={form.services}
          onChange={(event) => set("services", event.target.value)}
        />
      </FormField>

      <FormField label="Niches" htmlFor="pf-niches" hint="Comma-separated">
        <input
          id="pf-niches"
          className={fieldStyles.input}
          value={form.niches}
          onChange={(event) => set("niches", event.target.value)}
        />
      </FormField>

      <div className={styles.rateRow}>
        <FormField label="Target rate min (USD/hr)" htmlFor="pf-rate-min">
          <input
            id="pf-rate-min"
            type="number"
            min={0}
            className={fieldStyles.input}
            value={form.target_rate_min}
            onChange={(event) => set("target_rate_min", event.target.value)}
          />
        </FormField>
        <FormField label="Target rate max (USD/hr)" htmlFor="pf-rate-max">
          <input
            id="pf-rate-max"
            type="number"
            min={0}
            className={fieldStyles.input}
            value={form.target_rate_max}
            onChange={(event) => set("target_rate_max", event.target.value)}
          />
        </FormField>
      </div>

      <div className={styles.linksSection}>
        <h3 className={styles.linksTitle}>Your links</h3>
        <p className={styles.linksHint}>
          Proposals cite at most one of these — and only when it backs a matched
          portfolio claim.
        </p>
        {LINK_FIELDS.map((field) => (
          <FormField key={field.key} label={field.label} htmlFor={`pf-${field.key}`}>
            <input
              id={`pf-${field.key}`}
              className={fieldStyles.input}
              type="url"
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={(event) => set(field.key, event.target.value)}
            />
          </FormField>
        ))}
      </div>

      <div className={styles.submitRow}>
        <Button type="submit" loading={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
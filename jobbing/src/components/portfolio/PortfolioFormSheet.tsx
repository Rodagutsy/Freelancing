"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { fetchPortfolioFromUrl, savePortfolioProject } from "@/app/actions";
import type { PortfolioProjectRow } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FilterSheet } from "@/components/jobs/FilterSheet";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { useToast } from "@/components/common/Toast";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./PortfolioFormSheet.module.css";

interface PortfolioFormSheetProps {
  open: boolean;
  onClose: () => void;
  project: PortfolioProjectRow | null;
}

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_FORM = {
  title: "",
  description: "",
  skills: "",
  strength: "medium" as const,
  implementation_status: "designed" as const,
  evidence_links: "",
  can_claim_text: "",
  cannot_claim_text: "",
};

type LinkStatus = "idle" | "loading" | "done" | "error" | "profile";

export function PortfolioFormSheet({
  open,
  onClose,
  project,
}: PortfolioFormSheetProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState(() => {
    if (!project) return EMPTY_FORM;
    return {
      title: project.title,
      description: project.description ?? "",
      skills: project.skills.join(", "),
      strength: project.strength,
      implementation_status: project.implementation_status,
      evidence_links: project.evidence_links.join("\n"),
      can_claim_text: project.can_claim_text,
      cannot_claim_text: project.cannot_claim_text ?? "",
    };
  });
  const [images, setImages] = useState<string[]>(project?.image_urls ?? []);
  const [sourceUrl, setSourceUrl] = useState(project?.source_url ?? "");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [linkValue, setLinkValue] = useState("");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("idle");
  const [linkMessage, setLinkMessage] = useState("");
  const lastImported = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    const value = linkValue.trim();
    if (!value || value === lastImported.current) return;
    if (!/^https?:\/\//i.test(value)) return;

    const timer = setTimeout(async () => {
      lastImported.current = value;
      setLinkStatus("loading");
      setLinkMessage("");

      const result = await fetchPortfolioFromUrl(value);
      if (!result.ok || !result.data) {
        setLinkStatus("error");
        setLinkMessage(
          result.error ?? "Couldn't read that page — fill in manually.",
        );
        return;
      }

      const preview = result.data;
      if (preview.kind === "profile") {
        setLinkStatus("profile");
        setLinkMessage(
          "That's a profile link — it belongs in Settings → Your links. This form is for individual projects.",
        );
        return;
      }

      setForm((prev) => ({
        ...prev,
        title: prev.title || preview.title || "",
        description: prev.description || preview.description || "",
        skills: prev.skills || (preview.skills?.join(", ") ?? ""),
      }));

      const imageUrl = preview.storedImageUrl ?? preview.imageUrl;
      if (imageUrl) {
        setImages((prev) => (prev.includes(imageUrl) ? prev : [...prev, imageUrl]));
      }
      setSourceUrl(value);
      setLinkStatus("done");
      setLinkMessage("Imported from the link — check the details below.");
    }, 800);

    return () => clearTimeout(timer);
  }, [linkValue]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    if (files.some((file) => !ALLOWED_TYPES.includes(file.type))) {
      toast("Only JPG, PNG or WebP images are supported.", "error");
      return;
    }
    if (files.some((file) => file.size > MAX_FILE_BYTES)) {
      toast("Each image must be 5 MB or smaller.", "error");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      toast(`Up to ${MAX_IMAGES} images per project.`, "error");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You must be signed in to upload.");

      const room = MAX_IMAGES - images.length;
      const added: string[] = [];
      for (const file of files.slice(0, room)) {
        const ext =
          file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("portfolio-images")
          .upload(path, file, { contentType: file.type });
        if (error) throw new Error(error.message);
        const { data } = supabase.storage
          .from("portfolio-images")
          .getPublicUrl(path);
        added.push(data.publicUrl);
      }
      setImages((prev) => [...prev, ...added]);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Upload failed.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((item) => item !== url));
    const marker = "/object/public/portfolio-images/";
    const index = url.indexOf(marker);
    if (index !== -1) {
      const path = url.slice(index + marker.length).split("?")[0];
      void createClient().storage.from("portfolio-images").remove([path]);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const result = await savePortfolioProject(
      {
        title: form.title.trim(),
        description: form.description.trim() || null,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        strength: form.strength,
        implementation_status: form.implementation_status,
        evidence_links: form.evidence_links
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        image_urls: images,
        source_url: sourceUrl.trim() || null,
        can_claim_text: form.can_claim_text.trim(),
        cannot_claim_text: form.cannot_claim_text.trim() || null,
      },
      project?.id,
    );

    setPending(false);
    if (result.ok) {
      toast(project ? "Portfolio project updated." : "Portfolio project added.", "success");
      onClose();
      router.refresh();
    } else {
      toast(result.error ?? "Could not save the project.", "error");
    }
  }

  return (
    <FilterSheet
      open={open}
      onClose={onClose}
      title={project ? "Edit portfolio project" : "Add portfolio project"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            form="portfolio-form"
            type="submit"
            loading={pending}
            className={styles.submit}
          >
            {pending ? "Saving…" : project ? "Save changes" : "Add project"}
          </Button>
        </>
      }
    >
      <form id="portfolio-form" className={styles.form} onSubmit={handleSubmit}>
        <FormField
          label="Import from link"
          htmlFor="pf-import"
          hint="Paste a Behance, Pinterest or Upwork project URL — details auto-fill when possible."
        >
          <div className={styles.importRow}>
            <input
              id="pf-import"
              className={cn(fieldStyles.input, styles.importInput)}
              type="url"
              placeholder="https://www.behance.net/gallery/..."
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              autoComplete="off"
            />
            {linkStatus === "loading" && (
              <LoaderCircle className={cn(styles.spinIcon)} aria-hidden />
            )}
          </div>
        </FormField>

        {linkStatus === "done" && (
          <p className={cn(styles.statusRow, styles.statusOk)} role="status">
            {linkMessage}
          </p>
        )}
        {(linkStatus === "error" || linkStatus === "profile") && (
          <p className={cn(styles.statusRow, styles.statusError)} role="alert">
            {linkMessage}
          </p>
        )}

        <FormField label="Title" htmlFor="pf-title" required>
          <input
            id="pf-title"
            className={fieldStyles.input}
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            required
          />
        </FormField>

        <FormField label="Description" htmlFor="pf-description">
          <textarea
            id="pf-description"
            className={fieldStyles.textarea}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            rows={3}
          />
        </FormField>

        <FormField
          label="Skills"
          htmlFor="pf-skills"
          hint="Comma-separated, e.g. n8n, GoHighLevel, API Integration"
        >
          <input
            id="pf-skills"
            className={fieldStyles.input}
            value={form.skills}
            onChange={(event) => set("skills", event.target.value)}
          />
        </FormField>

        <div className={styles.row}>
          <FormField label="Strength" htmlFor="pf-strength">
            <select
              id="pf-strength"
              className={fieldStyles.select}
              value={form.strength}
              onChange={(event) =>
                set("strength", event.target.value as typeof form.strength)
              }
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </FormField>

          <FormField label="Implementation" htmlFor="pf-impl">
            <select
              id="pf-impl"
              className={fieldStyles.select}
              value={form.implementation_status}
              onChange={(event) =>
                set(
                  "implementation_status",
                  event.target.value as typeof form.implementation_status,
                )
              }
            >
              <option value="designed">Designed</option>
              <option value="deployed">Deployed</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </FormField>
        </div>

        <FormField
          label="Images"
          htmlFor="pf-images"
          hint={`Up to ${MAX_IMAGES} screenshots · JPG/PNG/WebP · max 5 MB each`}
        >
          <button
            type="button"
            className={styles.uploadBox}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <LoaderCircle className={styles.spinIcon} aria-hidden />
                Uploading…
              </>
            ) : (
              <>
                <ImagePlus aria-hidden />
                Add screenshots
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            id="pf-images"
            className={styles.hiddenInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFiles}
          />
          {images.length > 0 && (
            <div className={styles.thumbGrid}>
              {images.map((url) => (
                <div key={url} className={styles.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className={styles.thumbImg} />
                  <button
                    type="button"
                    className={styles.removeThumb}
                    onClick={() => removeImage(url)}
                    aria-label="Remove image"
                  >
                    <X size={14} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormField>

        <FormField
          label="Evidence links"
          htmlFor="pf-links"
          hint="One URL per line"
        >
          <textarea
            id="pf-links"
            className={fieldStyles.textarea}
            value={form.evidence_links}
            onChange={(event) => set("evidence_links", event.target.value)}
            rows={3}
          />
        </FormField>

        <FormField
          label="What you can claim"
          htmlFor="pf-can"
          hint="The AI may use ONLY this text as fact. Be precise and honest."
          required
        >
          <textarea
            id="pf-can"
            className={fieldStyles.textarea}
            value={form.can_claim_text}
            onChange={(event) => set("can_claim_text", event.target.value)}
            rows={4}
            required
          />
        </FormField>

        <FormField
          label="What you cannot claim"
          htmlFor="pf-cannot"
          hint="Hard negative constraint for the AI, e.g. specific revenue figures."
        >
          <textarea
            id="pf-cannot"
            className={fieldStyles.textarea}
            value={form.cannot_claim_text}
            onChange={(event) => set("cannot_claim_text", event.target.value)}
            rows={2}
          />
        </FormField>
      </form>
    </FilterSheet>
  );
}
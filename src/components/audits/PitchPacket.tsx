"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileText, Loader2, X } from "lucide-react";
import { buildPitchPacketAction, type PitchPacketData } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./PitchPacket.module.css";

interface PitchPacketProps {
  auditId: string;
  opportunityIds: string[];
}

function buildPacketText(data: PitchPacketData): string {
  const lines: string[] = [];
  lines.push(`PITCH PACKET — ${data.businessName}`);
  lines.push(data.url);
  if (data.profileName) lines.push(`Persona: ${data.profileName}`);
  lines.push("");
  lines.push(`SUBJECT: ${data.subjectLine}`);
  lines.push("");
  lines.push(data.pitchText);

  if (data.keyPoints.length > 0) {
    lines.push("");
    lines.push("KEY POINTS:");
    for (const point of data.keyPoints) lines.push(`- ${point}`);
  }

  if (data.needs.length > 0) {
    lines.push("");
    lines.push("WHY THIS BUSINESS NEEDS IT:");
    for (const need of data.needs) {
      lines.push(`- [${need.marker}] ${need.title} — ${need.summary}`);
    }
  }

  const offers = data.offers.filter(
    (offer) => offer.matchedServices.length > 0 || offer.matchedProjects.length > 0,
  );
  if (offers.length > 0) {
    lines.push("");
    lines.push("WHAT I CAN DO FOR THEM:");
    for (const offer of offers) {
      const services = offer.matchedServices.join(", ");
      const proof = offer.matchedProjects
        .map((project) => `\u201C${project.title}\u201D (${project.skills.join(", ")})`)
        .join(" | ");
      lines.push(`- ${offer.opportunityTitle}: ${services || "services available"}${proof ? ` — proof: ${proof}` : ""}`);
    }
  }

  return lines.join("\n");
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    return true;
  } catch {
    return false;
  }
}

export function PitchPacket({ auditId, opportunityIds }: PitchPacketProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PitchPacketData | null>(null);
  const [copyState, setCopyState] = useState<"pitch" | "packet" | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      titleRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      setOpen(false);
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  useEffect(() => {
    if (!open || data || loading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await buildPitchPacketAction(auditId, opportunityIds);
        if (cancelled) return;
        if (result.ok && result.data) {
          setData(result.data);
        } else {
          toast(result.error ?? "Failed to build pitch packet.", "error");
        }
      } catch {
        if (!cancelled) toast("Something went wrong.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, data, loading, auditId, opportunityIds, toast]);

  async function handleCopy(kind: "pitch" | "packet") {
    if (!data) return;
    const text = kind === "pitch" ? data.pitchText : buildPacketText(data);
    const ok = await copyText(text);
    if (ok) {
      setCopyState(kind);
      toast(kind === "pitch" ? "Pitch copied to clipboard." : "Full packet copied to clipboard.", "success");
      window.setTimeout(() => setCopyState(null), 1600);
    } else {
      toast("Could not copy. Select the text manually.", "error");
    }
  }

  const hasOffers =
    data !== null &&
    data.offers.some(
      (offer) => offer.matchedServices.length > 0 || offer.matchedProjects.length > 0,
    );

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        disabled={opportunityIds.length === 0}
      >
        <FileText size={16} aria-hidden />
        Pitch packet
      </Button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="pitch-packet-title">
        <div className={styles.content}>
          <div className={styles.header}>
            <h3 ref={titleRef} id="pitch-packet-title" tabIndex={-1} className={styles.title}>
              Pitch packet
            </h3>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Close pitch packet"
            >
              <X size={20} aria-hidden />
            </button>
          </div>

          {loading && (
            <div className={styles.state}>
              <Loader2 size={20} className={styles.spin} aria-hidden />
              Assembling your pitch packet…
            </div>
          )}

          {!loading && !data && (
            <div className={styles.state}>No pitch available yet.</div>
          )}

          {!loading && data && (
            <div className={styles.body}>
              <div className={styles.block}>
                <div className={styles.blockHeader}>
                  <span className={styles.blockLabel}>Pitch</span>
                  <button
                    type="button"
                    className={styles.copy}
                    onClick={() => void handleCopy("pitch")}
                  >
                    {copyState === "pitch" ? (
                      <Check size={14} aria-hidden />
                    ) : (
                      <Copy size={14} aria-hidden />
                    )}
                    {copyState === "pitch" ? "Copied" : "Copy pitch"}
                  </button>
                </div>
                <p className={styles.subject}>Subject: {data.subjectLine}</p>
                <p className={styles.pitchText}>{data.pitchText}</p>
                {data.keyPoints.length > 0 && (
                  <ul className={styles.points}>
                    {data.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>

              {data.needs.length > 0 && (
                <div className={styles.block}>
                  <span className={styles.blockLabel}>Why this business needs it</span>
                  <ul className={styles.list}>
                    {data.needs.map((need, index) => (
                      <li key={index} className={styles.listItem}>
                        <strong>[{need.marker}]</strong> {need.title} — {need.summary}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasOffers && (
                <div className={styles.block}>
                  <span className={styles.blockLabel}>What I can do for them</span>
                  <ul className={styles.list}>
                    {data.offers.map((offer) => {
                      const services = offer.matchedServices.join(", ");
                      const proof = offer.matchedProjects
                        .map((project) => `\u201C${project.title}\u201D (${project.skills.join(", ")})`)
                        .join(" · ");
                      if (!services && !proof) return null;
                      return (
                        <li key={offer.opportunityTitle} className={styles.listItem}>
                          <strong>{offer.opportunityTitle}:</strong> {services}
                          {proof && <span className={styles.proof}> — proof: {proof}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className={styles.footer}>
                <Button variant="secondary" onClick={() => void handleCopy("packet")}>
                  {copyState === "packet" ? (
                    <Check size={16} aria-hidden />
                  ) : (
                    <Copy size={16} aria-hidden />
                  )}
                  {copyState === "packet" ? "Copied" : "Copy full packet"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
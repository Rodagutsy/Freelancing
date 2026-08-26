"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createPersonaAction,
  deletePersonaAction,
  setDefaultPersonaAction,
} from "@/app/actions";
import type { PersonaPillar, ProfileRow } from "@/lib/types";
import { PILLAR_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/components/common/Toast";
import fieldStyles from "@/components/common/fields.module.css";
import { ProfileForm } from "./ProfileForm";
import styles from "./PersonaManager.module.css";

interface PersonaManagerProps {
  profiles: ProfileRow[];
}

export function PersonaManager({ profiles }: PersonaManagerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPillar, setNewPillar] = useState<PersonaPillar>("automation");
  const [adding, setAdding] = useState(false);

  const deleteTarget = profiles.find((p) => p.id === confirmDeleteId) ?? null;

  async function handleSetDefault(id: string) {
    setPendingId(id);
    const result = await setDefaultPersonaAction(id);
    setPendingId(null);
    if (result.ok) {
      toast("Default persona updated.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not update the default persona.", "error");
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    setPendingId(confirmDeleteId);
    const result = await deletePersonaAction(confirmDeleteId);
    setPendingId(null);
    setConfirmDeleteId(null);
    if (result.ok) {
      toast("Persona deleted.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not delete the persona.", "error");
    }
  }

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label || adding) return;
    setAdding(true);
    const result = await createPersonaAction({ label, pillar: newPillar });
    setAdding(false);
    if (result.ok && result.data) {
      toast("Persona created — fill in its details.", "success");
      setNewLabel("");
      setAddOpen(false);
      setExpandedId(result.data.id);
      router.refresh();
    } else {
      toast(result.error ?? "Could not create the persona.", "error");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {profiles.map((persona) => {
          const expanded = expandedId === persona.id;
          const pillar =
            persona.pillar !== null ? PILLAR_META[persona.pillar] : null;

          return (
            <article key={persona.id} className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleRow}>
                  <h3 className={styles.cardTitle}>{persona.label}</h3>
                  {pillar && (
                    <StatusBadge label={pillar.label} tone={pillar.tone} />
                  )}
                  {persona.is_default && (
                    <span className={styles.defaultBadge} title="Used for automatic scoring">
                      <CircleCheck className={styles.defaultIcon} aria-hidden />
                      Default
                    </span>
                  )}
                </div>
                <p className={styles.headlineSnippet}>
                  {persona.headline.trim() ||
                    "No headline yet — open Edit to fill this persona in."}
                </p>
              </div>

              <div className={styles.cardActions}>
                {!persona.is_default && (
                  <Button
                    variant="tertiary"
                    size="sm"
                    loading={pendingId === persona.id}
                    onClick={() => void handleSetDefault(persona.id)}
                  >
                    Set default
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setExpandedId(expanded ? null : persona.id)}
                  aria-expanded={expanded}
                >
                  {expanded ? (
                    <ChevronUp className={styles.actionIcon} aria-hidden />
                  ) : (
                    <ChevronDown className={styles.actionIcon} aria-hidden />
                  )}
                  {expanded ? "Close" : "Edit"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  aria-label={`Delete ${persona.label}`}
                  disabled={persona.is_default && profiles.length > 1}
                  title={
                    persona.is_default && profiles.length > 1
                      ? "Set another persona as default first"
                      : undefined
                  }
                  onClick={() => setConfirmDeleteId(persona.id)}
                >
                  <Trash2 className={styles.actionIcon} aria-hidden />
                </Button>
              </div>

              {expanded && (
                <div className={styles.editor}>
                  <ProfileForm profile={persona} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {addOpen ? (
        <div className={cn(styles.addCard, styles.card)}>
          <div className={styles.addRow}>
            <FormField
              label="Label"
              htmlFor="persona-add-label"
              hint="e.g. Product Design"
            >
              <input
                id="persona-add-label"
                className={fieldStyles.input}
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                maxLength={100}
              />
            </FormField>
            <FormField
              label="Pillar"
              htmlFor="persona-add-pillar"
              hint="Broad discipline this persona targets."
            >
              <select
                id="persona-add-pillar"
                className={fieldStyles.input}
                value={newPillar}
                onChange={(event) =>
                  setNewPillar(event.target.value as PersonaPillar)
                }
              >
                {(Object.keys(PILLAR_META) as PersonaPillar[]).map((key) => (
                  <option key={key} value={key}>
                    {PILLAR_META[key].label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className={styles.addActions}>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={adding} onClick={() => void handleAdd()}>
              <Plus className={styles.actionIcon} aria-hidden />
              Add persona
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className={styles.actionIcon} aria-hidden />
            Add persona
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete persona?"
        description={
          deleteTarget
            ? `"${deleteTarget.label}" will be removed. Existing scores that used it stay in your history.`
            : ""
        }
        confirmLabel="Delete"
        loading={pendingId === confirmDeleteId}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

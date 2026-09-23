"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Mail, CalendarClock } from "lucide-react";
import { saveOutboundStepsAction } from "@/app/actions";
import type { OutboundStep } from "@/lib/types";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./StepsEditor.module.css";

interface StepsEditorProps {
  outboundId: string;
  steps: OutboundStep[];
  personalizationAngle: string | null;
  editable: boolean;
}

export function StepsEditor({
  outboundId,
  steps,
  personalizationAngle,
  editable,
}: StepsEditorProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [editedSteps, setEditedSteps] = useState<OutboundStep[]>(steps);
  const [angle, setAngle] = useState(personalizationAngle ?? "");
  const [saving, setSaving] = useState(false);

  function updateStep(order: number, patch: Partial<OutboundStep>) {
    setEditedSteps((prev) =>
      prev.map((s) => (s.order === order ? { ...s, ...patch } : s)),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveOutboundStepsAction(outboundId, {
        steps: editedSteps,
        personalizationAngle: angle || null,
      });
      if (result.ok) {
        toast("Sequence updated.", "success");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to save.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.angleWrap}>
        <label className={styles.label} htmlFor="angle">
          Personalization angle
        </label>
        {editable ? (
          <textarea
            id="angle"
            className={styles.angleInput}
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            rows={2}
            disabled={saving}
          />
        ) : (
          <p className={styles.angleStatic}>{angle || "No angle recorded."}</p>
        )}
      </div>

      <div className={styles.steps}>
        {[...editedSteps]
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <fieldset key={step.order} className={styles.step}>
              <legend className={styles.stepHead}>
                <span className={styles.stepTitle}>
                  <Mail size={14} aria-hidden />
                  Email {step.order}
                </span>
                <span className={styles.stepDay}>
                  <CalendarClock size={12} aria-hidden />
                  Day {step.day_offset}
                </span>
              </legend>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`subject-${step.order}`}>
                  Subject
                </label>
                <input
                  id={`subject-${step.order}`}
                  className={styles.input}
                  value={step.subject}
                  onChange={(e) => updateStep(step.order, { subject: e.target.value })}
                  readOnly={!editable}
                  disabled={saving}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`body-${step.order}`}>
                  Body
                </label>
                <textarea
                  id={`body-${step.order}`}
                  className={styles.body}
                  value={step.body}
                  onChange={(e) => updateStep(step.order, { body: e.target.value })}
                  rows={7}
                  readOnly={!editable}
                  disabled={saving}
                />
              </div>
            </fieldset>
          ))}
      </div>

      {editable && (
        <div>
          <Button onClick={handleSave} loading={saving}>
            <Save size={16} aria-hidden />
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}
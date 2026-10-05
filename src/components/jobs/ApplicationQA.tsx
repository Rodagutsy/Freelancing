"use client";

import { useState } from "react";
import { Copy, Plus, Sparkles, Trash2 } from "lucide-react";
import { answerApplicationQuestionsAction } from "@/app/actions";
import { MAX_APPLICATION_QUESTIONS } from "@/lib/schemas/questionAnswering";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./ApplicationQA.module.css";

interface PersonaOption {
  id: string;
  label: string;
}

interface Answer {
  question: string;
  answer: string;
}

interface ApplicationQAProps {
  jobId: string;
  profiles?: PersonaOption[];
  defaultPersonaId?: string | null;
}

export function ApplicationQA({
  jobId,
  profiles = [],
  defaultPersonaId = null,
}: ApplicationQAProps) {
  const { toast } = useToast();

  const [questions, setQuestions] = useState<string[]>([""]);
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [pending, setPending] = useState(false);
  const [personaId, setPersonaId] = useState(defaultPersonaId ?? "");

  const filled = questions.map((question) => question.trim()).filter(Boolean);
  const canSubmit = filled.length > 0 && !pending;
  const atLimit = questions.length >= MAX_APPLICATION_QUESTIONS;

  function setQuestion(index: number, value: string) {
    setQuestions((prev) =>
      prev.map((question, i) => (i === index ? value : question)),
    );
  }

  function addQuestion() {
    if (atLimit) return;
    setQuestions((prev) => [...prev, ""]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) =>
      prev.length === 1 ? [""] : prev.filter((_, i) => i !== index),
    );
  }

  async function run() {
    if (!canSubmit) return;
    setPending(true);
    setAnswers(null);
    try {
      const result = await answerApplicationQuestionsAction(
        { jobId, questions: filled },
        personaId || undefined,
      );
      if (!result.ok || !result.data) {
        toast(result.error ?? "Answers could not be drafted.", "error");
        return;
      }
      setAnswers(result.data.answers);
    } catch {
      toast("Answers could not be drafted. Retry or answer manually.", "error");
    } finally {
      setPending(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Answer copied.", "success");
    } catch {
      toast("Copy failed. Select the text and copy manually.", "error");
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.note}>
        Paste the screening questions from the Upwork apply form. Answers are
        drafted from your verified portfolio only — review and edit before you
        paste them in.
      </p>

      <ol className={styles.questionList}>
        {questions.map((question, index) => (
          <li key={index} className={styles.questionRow}>
            <label className={styles.questionLabel} htmlFor={`qa-question-${index}`}>
              Question {index + 1}
            </label>
            <textarea
              id={`qa-question-${index}`}
              className={fieldStyles.textarea}
              value={question}
              onChange={(event) => setQuestion(index, event.target.value)}
              placeholder="e.g. Have you built n8n workflows that integrate with a CRM?"
              maxLength={500}
              rows={2}
              disabled={pending}
            />
            {questions.length > 1 && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeQuestion(index)}
                disabled={pending}
                aria-label={`Remove question ${index + 1}`}
              >
                <Trash2 className={styles.removeIcon} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className={styles.toolbar}>
        <Button
          variant="tertiary"
          size="sm"
          onClick={addQuestion}
          disabled={atLimit || pending}
        >
          <Plus className={styles.actionIcon} aria-hidden />
          Add question
        </Button>

        {profiles.length > 0 && (
          <label className={styles.personaLabel} htmlFor="qa-persona">
            Answer as
            <select
              id="qa-persona"
              className={fieldStyles.input}
              value={personaId}
              onChange={(event) => setPersonaId(event.target.value)}
              disabled={pending}
            >
              {profiles.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <Button onClick={() => void run()} disabled={!canSubmit} loading={pending}>
          <Sparkles className={styles.actionIcon} aria-hidden />
          {pending ? "Drafting answers…" : "Draft answers"}
        </Button>
      </div>

      {pending && (
        <p className={styles.status} role="status">
          Drafting answers from your portfolio…
        </p>
      )}

      {answers && answers.length > 0 && (
        <div className={styles.answers}>
          {answers.map((entry) => (
            <article key={entry.question} className={styles.answerCard}>
              <h3 className={styles.answerQuestion}>{entry.question}</h3>
              <p className={styles.answerText}>{entry.answer}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copy(entry.answer)}
              >
                <Copy className={styles.actionIcon} aria-hidden />
                Copy answer
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
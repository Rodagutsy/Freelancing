"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/common/Button";
import { FilterSheet } from "@/components/jobs/FilterSheet";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./FilterBar.module.css";

export interface FilterState {
  score: string;
  posted: string;
  budget: string;
  rating: string;
  status: string;
  skills: string;
  persona: string;
}

export const DEFAULT_FILTERS: FilterState = {
  score: "0",
  posted: "1440",
  budget: "",
  rating: "",
  status: "all",
  skills: "",
  persona: "",
};

const SCORE_OPTIONS = [
  { value: "0", label: "Any score" },
  { value: "7", label: "7.0+" },
  { value: "8", label: "8.0+" },
  { value: "9", label: "9.0+" },
];

const POSTED_OPTIONS = [
  { value: "24", label: "Last 24 hours" },
  { value: "48", label: "Last 48 hours" },
  { value: "168", label: "Last 7 days" },
  { value: "720", label: "Last 30 days" },
  { value: "1440", label: "Last 60 days" },
  { value: "2160", label: "Last 90 days" },
  { value: "0", label: "Any time" },
];

const BUDGET_OPTIONS = [
  { value: "", label: "Any budget" },
  { value: "100", label: "$100+" },
  { value: "300", label: "$300+" },
  { value: "500", label: "$500+" },
  { value: "1000", label: "$1,000+" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "4.0", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
  { value: "4.8", label: "4.8+" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "apply", label: "Apply" },
  { value: "review", label: "Review" },
  { value: "skip", label: "Skip" },
];

function parseFromParams(params: URLSearchParams): FilterState {
  return {
    score: params.get("score") ?? DEFAULT_FILTERS.score,
    posted: params.get("posted") ?? DEFAULT_FILTERS.posted,
    budget: params.get("budget") ?? DEFAULT_FILTERS.budget,
    rating: params.get("rating") ?? DEFAULT_FILTERS.rating,
    status: params.get("status") ?? DEFAULT_FILTERS.status,
    skills: params.get("skills") ?? DEFAULT_FILTERS.skills,
    persona: params.get("profileId") ?? DEFAULT_FILTERS.persona,
  };
}

function activeCount(state: FilterState): number {
  let count = 0;
  if (state.score !== DEFAULT_FILTERS.score) count += 1;
  if (state.posted !== DEFAULT_FILTERS.posted) count += 1;
  if (state.budget) count += 1;
  if (state.rating) count += 1;
  if (state.status !== DEFAULT_FILTERS.status) count += 1;
  if (state.skills.trim()) count += 1;
  if (state.persona) count += 1;
  return count;
}

interface FilterBarProps {
  searchParams: Record<string, string>;
  profiles: Array<{ id: string; label: string }>;
}

export function FilterBar({ searchParams, profiles }: FilterBarProps) {
  const router = useRouter();
  const [state, setState] = useState<FilterState>(() =>
    parseFromParams(new URLSearchParams(searchParams)),
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const commit = useCallback(
    (next: FilterState) => {
      const params = new URLSearchParams();
      if (next.score !== DEFAULT_FILTERS.score) params.set("score", next.score);
      if (next.posted !== DEFAULT_FILTERS.posted) params.set("posted", next.posted);
      if (next.budget) params.set("budget", next.budget);
      if (next.rating) params.set("rating", next.rating);
      if (next.status !== "all") params.set("status", next.status);
      if (next.skills.trim()) params.set("skills", next.skills.trim());
      if (next.persona) params.set("profileId", next.persona);
      const qs = params.toString();
      router.replace(qs ? `/jobs?${qs}` : "/jobs", { scroll: false });
    },
    [router],
  );

  const update = useCallback(
    (patch: Partial<FilterState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        return next;
      });
    },
    [],
  );

  const updateAndCommit = useCallback(
    (patch: Partial<FilterState>) => {
      const next = { ...state, ...patch };
      setState(next);
      commit(next);
    },
    [state, commit],
  );

  const clear = useCallback(() => {
    setState(DEFAULT_FILTERS);
    commit(DEFAULT_FILTERS);
    setSheetOpen(false);
  }, [commit]);

  const count = activeCount(state);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setSheetOpen(true)}
      >
        <SlidersHorizontal className={styles.triggerIcon} aria-hidden />
        Filters{count > 0 ? ` (${count})` : ""}
      </button>

      <div className={styles.bar}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Score</span>
          <select
            className={fieldStyles.select}
            value={state.score}
            onChange={(event) => updateAndCommit({ score: event.target.value })}
          >
            {SCORE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Posted</span>
          <select
            className={fieldStyles.select}
            value={state.posted}
            onChange={(event) => updateAndCommit({ posted: event.target.value })}
          >
            {POSTED_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Budget</span>
          <select
            className={fieldStyles.select}
            value={state.budget}
            onChange={(event) => updateAndCommit({ budget: event.target.value })}
          >
            {BUDGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Client rating</span>
          <select
            className={fieldStyles.select}
            value={state.rating}
            onChange={(event) => updateAndCommit({ rating: event.target.value })}
          >
            {RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Status</span>
          <select
            className={fieldStyles.select}
            value={state.status}
            onChange={(event) => updateAndCommit({ status: event.target.value })}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {profiles.length > 0 && (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Persona</span>
            <select
              className={fieldStyles.select}
              value={state.persona}
              onChange={(event) => updateAndCommit({ persona: event.target.value })}
            >
              <option value="">All personas</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.skillsField}>
          <span className={styles.fieldLabel}>Skills</span>
          <input
            className={fieldStyles.input}
            type="text"
            value={state.skills}
            placeholder="n8n, GoHighLevel"
            onChange={(event) => update({ skills: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit(state);
            }}
          />
        </label>

        <Button
          variant="secondary"
          onClick={() => commit(state)}
          className={styles.apply}
        >
          Apply
        </Button>

        {count > 0 && (
          <button type="button" className={styles.clearAll} onClick={clear}>
            Clear all
          </button>
        )}
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`Filters${count > 0 ? ` (${count})` : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={clear} className={styles.sheetClear}>
              Clear all
            </Button>
            <Button
              onClick={() => {
                commit(state);
                setSheetOpen(false);
              }}
              className={styles.sheetApply}
            >
              Apply filters
            </Button>
          </>
        }
      >
        <div className={styles.sheetFields}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Score</span>
            <select
              className={fieldStyles.select}
              value={state.score}
              onChange={(event) => update({ score: event.target.value })}
            >
              {SCORE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Posted</span>
            <select
              className={fieldStyles.select}
              value={state.posted}
              onChange={(event) => update({ posted: event.target.value })}
            >
              {POSTED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Budget</span>
            <select
              className={fieldStyles.select}
              value={state.budget}
              onChange={(event) => update({ budget: event.target.value })}
            >
              {BUDGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Client rating</span>
            <select
              className={fieldStyles.select}
              value={state.rating}
              onChange={(event) => update({ rating: event.target.value })}
            >
              {RATING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Status</span>
            <select
              className={fieldStyles.select}
              value={state.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {profiles.length > 0 && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Persona</span>
              <select
                className={fieldStyles.select}
                value={state.persona}
                onChange={(event) => update({ persona: event.target.value })}
              >
                <option value="">All personas</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Skills</span>
            <input
              className={fieldStyles.input}
              type="text"
              value={state.skills}
              placeholder="Comma-separated, e.g. n8n, GoHighLevel"
              onChange={(event) => update({ skills: event.target.value })}
            />
          </label>
        </div>
      </FilterSheet>
    </div>
  );
}
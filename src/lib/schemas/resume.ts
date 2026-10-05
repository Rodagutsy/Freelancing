import { z } from "zod";

/** Hard cap on what we send to the AI — resumes are long but not unbounded. */
export const RESUME_MAX_TEXT_CHARS = 12_000;

/** Max accepted upload size, in bytes. */
export const RESUME_MAX_FILE_BYTES = 2 * 1024 * 1024;

export const RESUME_ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
] as const;

const optionalLine = z.string().trim().min(1).max(300).optional();
const optionalRate = z.coerce.number().min(0).max(100_000).optional();

/**
 * Structured profile data the AI extracts from resume text. Every field is
 * optional: the model omits anything it is not confident about rather than
 * guessing, so a sparse resume yields a sparse object instead of errors.
 */
export const resumeExtractSchema = z
  .object({
    name: optionalLine,
    headline: optionalLine,
    bio: z.string().trim().min(1).max(4000).optional(),
    services: z.array(z.string().trim().min(1).max(120)).max(15).optional(),
    niches: z.array(z.string().trim().min(1).max(120)).max(15).optional(),
    skills: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
    target_rate_min: optionalRate,
    target_rate_max: optionalRate,
  })
  .refine(
    (data) =>
      data.target_rate_min === undefined ||
      data.target_rate_max === undefined ||
      data.target_rate_max >= data.target_rate_min,
    {
      message: "Extracted max rate is below the min rate",
      path: ["target_rate_max"],
    },
  );

export type ResumeExtract = z.infer<typeof resumeExtractSchema>;
export type ResumeExtractField = keyof ResumeExtract;

/** Field labels for the review-before-apply preview in Settings. */
export const RESUME_FIELD_LABELS: Record<ResumeExtractField, string> = {
  name: "Name",
  headline: "Headline",
  bio: "Bio",
  services: "Services",
  niches: "Niches",
  skills: "Skills (portfolio hint)",
  target_rate_min: "Target rate min",
  target_rate_max: "Target rate max",
};

/** Fields that need a comma-separated list in the UI, not a single string. */
export const RESUME_LIST_FIELDS: ReadonlySet<ResumeExtractField> = new Set([
  "services",
  "niches",
  "skills",
]);

/** Order the preview renders in — most identifying fields first. */
export const RESUME_FIELD_ORDER: ReadonlyArray<ResumeExtractField> = [
  "name",
  "headline",
  "bio",
  "services",
  "niches",
  "skills",
  "target_rate_min",
  "target_rate_max",
];

/** Present, non-empty fields only, in preview order. */
export function resumeFieldsPresent(
  extract: ResumeExtract,
): Array<{ field: ResumeExtractField; label: string; value: string }> {
  return RESUME_FIELD_ORDER.flatMap((field) => {
    const value = extract[field];
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) {
      if (value.length === 0) return [];
      return [
        {
          field,
          label: RESUME_FIELD_LABELS[field],
          value: value.join(", "),
        },
      ];
    }
    if (typeof value !== "string" || value.trim() === "") return [];
    return [{ field, label: RESUME_FIELD_LABELS[field], value }];
  });
}
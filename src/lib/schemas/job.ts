import { z } from "zod";

export const jobFiltersSchema = z.object({
  scoreMin: z.coerce.number().min(0).max(10).optional(),
  scoreMax: z.coerce.number().min(0).max(10).optional(),
  postedHours: z.coerce.number().int().min(1).max(2160).optional(),
  budgetMin: z.coerce.number().min(0).optional(),
  clientRating: z.coerce.number().min(0).max(5).optional(),
  skills: z.array(z.string().trim().min(1)).max(20).optional(),
  status: z.enum(["apply", "review", "skip", "all"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(["score_desc", "newest"]).default("score_desc"),
});

export type JobFilters = z.infer<typeof jobFiltersSchema>;

/** Must be an Upwork job link so the app can attempt to read it. */
export const upworkUrlSchema = z
  .string()
  .trim()
  .url()
  .refine(
    (value) => /^https:\/\/(www\.)?upwork\.com\//i.test(value),
    "Enter an Upwork job link (https://www.upwork.com/jobs/~...).",
  );

export const addJobInputSchema = z.object({
  url: upworkUrlSchema,
  title: z.string().trim().min(3, "Title is required.").max(300),
  description: z
    .string()
    .trim()
    .min(20, "Description is required (at least 20 characters).")
    .max(20000),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  budget_type: z.enum(["fixed", "hourly"]).optional(),
  budget_min: z.coerce.number().min(0).optional(),
  budget_max: z.coerce.number().min(0).optional(),
});

export type AddJobInput = z.infer<typeof addJobInputSchema>;
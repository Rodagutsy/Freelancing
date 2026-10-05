import { z } from "zod";
import { uuidSchema } from "@/lib/schemas/common";

/** Upwork's screening question box is small; 5 is a generous ceiling. */
export const MAX_APPLICATION_QUESTIONS = 5;

export const applicationQAInputSchema = z.object({
  jobId: uuidSchema,
  questions: z
    .array(
      z
        .string()
        .trim()
        .min(3, "Each question needs at least 3 characters.")
        .max(500, "Keep each question under 500 characters."),
    )
    .min(1, "Add at least one question.")
    .max(
      MAX_APPLICATION_QUESTIONS,
      `Up to ${MAX_APPLICATION_QUESTIONS} questions at once.`,
    ),
});

export type ApplicationQAInput = z.infer<typeof applicationQAInputSchema>;

/** Expected strict-JSON shape from the DeepSeek answers call. */
export const applicationQAOutputSchema = z.object({
  answers: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(500),
        answer: z.string().trim().min(1).max(1000),
      }),
    )
    .min(1)
    .max(MAX_APPLICATION_QUESTIONS),
});

export type ApplicationQAOutput = z.infer<typeof applicationQAOutputSchema>;
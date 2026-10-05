import { z } from "zod";
import { nonEmptyText } from "@/lib/schemas/common";

/**
 * Input for a standalone cover letter — used for off-platform jobs where there
 * is no `jobs` row, e.g. an ATS application or a role found by hand.
 */
export const coverLetterInputSchema = z.object({
  jobTitle: nonEmptyText.max(200),
  jobDescription: z.string().trim().min(20, "Paste the job description — at least 20 characters.").max(8000),
  companyName: z.string().trim().max(200).optional(),
});

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>;

/** Expected strict-JSON shape from the DeepSeek cover-letter call. */
export const coverLetterOutputSchema = z.object({
  letter_text: z.string().min(1).max(6000),
  angle: z.string().min(1).max(500),
  used_projects: z.array(z.string().uuid()).max(5),
});

export type CoverLetterOutput = z.infer<typeof coverLetterOutputSchema>;
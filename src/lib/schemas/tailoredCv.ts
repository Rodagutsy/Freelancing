import { z } from "zod";

/**
 * Expected strict-JSON shape from the DeepSeek tailored-CV call. The CV is a
 * plain-text (markdown-ish) document tailored from a persona's master CV.
 */
export const tailoredCvOutputSchema = z.object({
  cv_text: z.string().min(1).max(12000),
  angle: z.string().min(1).max(500),
  used_projects: z.array(z.string().uuid()).max(6),
});

export type TailoredCvOutput = z.infer<typeof tailoredCvOutputSchema>;

import { z } from "zod";

export const regenerateInstructionSchema = z.enum([
  "Shorter",
  "More technical",
  "More direct",
  "Emphasize portfolio",
]);

export type RegenerateInstruction = z.infer<
  typeof regenerateInstructionSchema
>;

/** Expected strict-JSON shape from the DeepSeek proposal call. */
export const proposalOutputSchema = z.object({
  draft_text: z.string().min(1).max(5000),
  angle: z.string().min(1).max(500),
  used_projects: z.array(z.string().uuid()).max(5),
});

export type ProposalOutput = z.infer<typeof proposalOutputSchema>;

/** Expected strict-JSON shape from the DeepSeek scoring call. */
export const scoreOutputSchema = z.object({
  score_total: z.number().min(0).max(10),
  confidence: z.number().min(0).max(1),
  recommendation: z.enum(["APPLY", "REVIEW", "SKIP"]),
  explanation: z.string().min(1).max(5000),
  factors: z.record(z.string(), z.number().min(0).max(10)),
});

export type ScoreOutput = z.infer<typeof scoreOutputSchema>;
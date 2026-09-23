import { z } from "zod";
import { uuidSchema } from "@/lib/schemas/common";

export const outcomeSchema = z.enum([
  "unknown",
  "viewed",
  "interview",
  "hired",
  "rejected",
]);

export const applicationCreateSchema = z.object({
  jobId: uuidSchema,
  proposalId: uuidSchema.nullable().optional(),
  scoreAtApply: z.number().min(0).max(10),
  outcome: outcomeSchema.default("unknown"),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const applicationUpdateSchema = z.object({
  outcome: outcomeSchema.optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export type ApplicationCreate = z.infer<typeof applicationCreateSchema>;
export type ApplicationUpdate = z.infer<typeof applicationUpdateSchema>;
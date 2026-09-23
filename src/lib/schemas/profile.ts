import { z } from "zod";
import { nonEmptyText, optionalUrlSchema, textArraySchema } from "@/lib/schemas/common";

export const PILLAR_VALUES = ["design", "build", "automation", "growth"] as const;

export const pillarSchema = z.enum(PILLAR_VALUES);

export type PersonaPillar = (typeof PILLAR_VALUES)[number];

export const profileInputSchema = z
  .object({
    label: nonEmptyText.max(100),
    name: nonEmptyText.max(200),
    headline: nonEmptyText.max(200),
    bio: z.string().trim().max(5000).nullable().optional(),
    services: textArraySchema,
    niches: textArraySchema,
    target_rate_min: z.coerce.number().min(0).max(100000).nullable().optional(),
    target_rate_max: z.coerce.number().min(0).max(100000).nullable().optional(),
    behance_url: optionalUrlSchema,
    pinterest_url: optionalUrlSchema,
    linkedin_url: optionalUrlSchema,
    upwork_profile_url: optionalUrlSchema,
    website_url: optionalUrlSchema,
  })
  .refine(
    (data) =>
      data.target_rate_min === null ||
      data.target_rate_max === null ||
      data.target_rate_min === undefined ||
      data.target_rate_max === undefined ||
      (data.target_rate_max ?? 0) >= (data.target_rate_min ?? 0),
    {
      message: "Maximum rate must be greater than or equal to minimum rate",
      path: ["target_rate_max"],
    },
  );

/** New persona creation: label + pillar only; the rest is filled in later. */
export const personaCreateSchema = z.object({
  label: nonEmptyText.max(100),
  pillar: pillarSchema,
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type PersonaCreateInput = z.infer<typeof personaCreateSchema>;

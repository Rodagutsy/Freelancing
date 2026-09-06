import { z } from "zod";
import { nonEmptyText, optionalUrlSchema, textArraySchema } from "@/lib/schemas/common";
import { assertSafeUrl } from "@/lib/schemas/audit";

export const portfolioProjectInputSchema = z.object({
  title: nonEmptyText.max(200, "Keep the title under 200 characters"),
  description: z.string().trim().max(5000).nullable().optional(),
  skills: textArraySchema,
  strength: z.enum(["high", "medium", "low"]),
  implementation_status: z.enum(["designed", "deployed", "hybrid"]),
  evidence_links: z
    .array(z.string().trim().max(1000))
    .max(20)
    .default([])
    .refine(
      (links) => links.every((l) => !l || assertSafeUrl(l)),
      "One or more evidence links are not publicly accessible.",
    ),
  image_urls: z
    .array(z.string().trim().url("Must be a valid URL").max(1000))
    .max(10, "Up to 10 images per project")
    .default([])
    .refine(
      (urls) => urls.every((u) => assertSafeUrl(u)),
      "One or more image URLs are not publicly accessible.",
    ),
  source_url: optionalUrlSchema,
  can_claim_text: nonEmptyText.max(3000),
  cannot_claim_text: z.string().trim().max(3000).nullable().optional(),
});

export type PortfolioProjectInput = z.infer<typeof portfolioProjectInputSchema>;
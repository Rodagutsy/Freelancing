import { z } from "zod";
import { nonEmptyText, optionalUrlSchema, uuidSchema } from "@/lib/schemas/common";

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

/**
 * SSRF-safe URL validation: blocks private IPs, localhost, link-local,
 * IPv6 private ranges, and internal TLDs.
 */
export function assertSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;

    const host = url.hostname.toLowerCase();

    // Exact matches
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]"
    )
      return false;

    // IPv4 private / reserved ranges
    if (/^10\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false; // link-local
    if (/^100\.(6[4-9]|[7-9]\d|1[01][0-9]|12[0-7])\./.test(host)) return false; // carrier-grade NAT

    // IPv6 private / reserved (strip brackets if present)
    const raw = host.replace(/^\[|\]$/g, "");
    if (
      raw === "::" ||
      raw.startsWith("fc") ||
      raw.startsWith("fd") ||
      raw.startsWith("fe80") ||
      raw.startsWith("::ffff:") ||
      raw.startsWith("::ffff:127.") ||
      raw.startsWith("::ffff:10.") ||
      raw.startsWith("::ffff:172.16.") ||
      raw.startsWith("::ffff:192.168.") ||
      raw.startsWith("::ffff:169.254.")
    )
      return false;

    // Internal TLDs
    if (host.endsWith(".local") || host.endsWith(".internal")) return false;

    return true;
  } catch {
    return false;
  }
}

export const auditCreateSchema = z.object({
  url: z
    .string()
    .trim()
    .url("Enter a valid URL.")
    .max(2000)
    .refine(assertSafeUrl, "This URL is not publicly accessible."),
  business_name: z.string().trim().max(200).optional(),
  industry: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
});

export type AuditCreateInput = z.infer<typeof auditCreateSchema>;

export const auditStatusSchema = z.enum([
  "created",
  "queued",
  "crawling",
  "analyzing",
  "scoring",
  "opportunities",
  "completed",
  "failed",
  "cancelled",
]);

export type AuditStatus = z.infer<typeof auditStatusSchema>;

/* ------------------------------------------------------------------ */
/* Opportunity                                                         */
/* ------------------------------------------------------------------ */

export const AUDIT_CATEGORY_VALUES = [
  "lead_capture",
  "appointment",
  "crm",
  "ecommerce",
  "email",
  "whatsapp",
  "support",
  "quote",
  "internal_workflow",
  "ai_agent",
  "seo",
  "performance",
  "ui_ux",
  "other",
] as const;

export const auditOpportunityCategorySchema = z.enum(AUDIT_CATEGORY_VALUES);

export const auditIssueCategorySchema = z.enum([
  "ux",
  "ui",
  "performance",
  "accessibility",
  "seo",
  "conversion",
  "technical",
]);

export const severitySchema = z.enum(["critical", "high", "medium", "low", "info"]);

export const classificationSchema = z.enum(["observed", "inferred", "confirmed"]);

/* ------------------------------------------------------------------ */
/* Prospect                                                            */
/* ------------------------------------------------------------------ */

export const prospectCreateSchema = z.object({
  company_name: nonEmptyText.max(200),
  website_url: optionalUrlSchema,
  industry: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  contact_name: z.string().trim().max(200).optional(),
  contact_email: z.string().trim().email().optional().or(z.literal("")),
  contact_phone: z.string().trim().max(50).optional(),
  source: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export type ProspectCreateInput = z.infer<typeof prospectCreateSchema>;

export const prospectUpdateSchema = prospectCreateSchema.partial().extend({
  pipeline_status: z
    .enum(["prospecting", "contacted", "proposal_sent", "negotiating", "won", "lost"])
    .optional(),
});

export type ProspectUpdateInput = z.infer<typeof prospectUpdateSchema>;

/* ------------------------------------------------------------------ */
/* Pitch generation input                                              */
/* ------------------------------------------------------------------ */

export const pitchGenerateSchema = z.object({
  audit_id: uuidSchema,
  opportunity_ids: z.array(uuidSchema).min(1).max(10),
});

export type PitchGenerateInput = z.infer<typeof pitchGenerateSchema>;

/** Expected strict-JSON shape from the DeepSeek pitch call. */
export const pitchOutputSchema = z.object({
  pitch_text: z.string().min(1).max(5000),
  subject_line: z.string().min(1).max(200),
  key_points: z.array(z.string().min(1).max(300)).min(1).max(5),
});

export type PitchOutput = z.infer<typeof pitchOutputSchema>;

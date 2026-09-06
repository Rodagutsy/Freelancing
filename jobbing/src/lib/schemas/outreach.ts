import { z } from "zod";
import { uuidSchema } from "@/lib/schemas/common";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const outboundStatusSchema = z.enum([
  "researching",
  "pitch_drafted",
  "need_approval",
  "approved",
  "rejected",
  "sending",
  "sent",
  "replied",
  "follow_up_1",
  "follow_up_2",
  "done",
  "do_not_contact",
  "failed",
]);

export type OutboundStatus = z.infer<typeof outboundStatusSchema>;

export const outboundMessageStatusSchema = z.enum([
  "draft",
  "queued",
  "sent",
  "delivered",
  "opened",
  "failed",
]);

export type OutboundMessageStatus = z.infer<typeof outboundMessageStatusSchema>;

export const suppressionReasonSchema = z.enum([
  "unsubscribed",
  "replied_stop",
  "bounced",
  "manual",
  "legal",
]);

export type SuppressionReason = z.infer<typeof suppressionReasonSchema>;

export const replyClassificationSchema = z.enum([
  "interested",
  "question",
  "not_interested",
  "wrong_person",
  "unsubscribe",
]);

export type ReplyClassification = z.infer<typeof replyClassificationSchema>;

export const prospectContactTypeSchema = z.enum([
  "corporate",
  "sole_trader",
  "individual",
]);

export type ProspectContactType = z.infer<typeof prospectContactTypeSchema>;

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

/**
 * One outreach step. `day_offset` is the number of days after the previous
 * step / campaign start at which a follow-up should be sent (0 = first email).
 */
export const outboundStepSchema = z.object({
  order: z.number().int().min(1).max(5),
  day_offset: z.number().int().min(0).max(365),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export type OutboundStep = z.infer<typeof outboundStepSchema>;

export const outboundStepsSchema = z.array(outboundStepSchema).min(1).max(5);

export type OutboundSteps = z.infer<typeof outboundStepsSchema>;

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export const emailSequenceCreateSchema = z.object({
  name: z.string().trim().min(1, "Sequence name is required.").max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  steps: outboundStepsSchema,
});

export type EmailSequenceCreate = z.infer<typeof emailSequenceCreateSchema>;

export const outboundCreateSchema = z.object({
  prospectId: uuidSchema,
  emailSequenceId: uuidSchema.nullable().optional(),
  steps: outboundStepsSchema,
  personalizationAngle: z.string().trim().max(2000).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  status: outboundStatusSchema.default("pitch_drafted"),
});

export type OutboundCreate = z.infer<typeof outboundCreateSchema>;

export const outboundStepsUpdateSchema = z.object({
  steps: outboundStepsSchema,
  personalizationAngle: z.string().trim().max(2000).nullable().optional(),
});

export type OutboundStepsUpdate = z.infer<typeof outboundStepsUpdateSchema>;

export const outboundStatusUpdateSchema = z.object({
  status: outboundStatusSchema,
  approvalNote: z.string().trim().max(2000).nullable().optional(),
  currentStep: z.number().int().min(0).nullable().optional(),
});

export type OutboundStatusUpdate = z.infer<typeof outboundStatusUpdateSchema>;

/* ------------------------------------------------------------------ */
/* Draft generation (human-in-the-loop)                                */
/* ------------------------------------------------------------------ */

/** UI input for drafting an outbound campaign. */
export const outboundDraftInputSchema = z.object({
  prospectId: uuidSchema,
  auditIds: z.array(uuidSchema).max(10).optional(),
  primaryAuditId: uuidSchema.nullable().optional(),
  emailSequenceId: uuidSchema.nullable().optional(),
});

export type OutboundDraftInput = z.infer<typeof outboundDraftInputSchema>;

/** Expected strict-JSON shape from the DeepSeek outbound draft call. */
export const outboundDraftOutputSchema = z.object({
  personalization_angle: z.string().trim().min(1).max(2000),
  steps: outboundStepsSchema,
});

export type OutboundDraftOutput = z.infer<typeof outboundDraftOutputSchema>;

export const outboundRejectSchema = z.object({
  note: z.string().trim().max(2000).nullable().optional(),
});

export type OutboundReject = z.infer<typeof outboundRejectSchema>;

export const outboundReviseSchema = z.object({
  instruction: z.string().trim().min(1, "Describe what to change.").max(500),
});

export type OutboundRevise = z.infer<typeof outboundReviseSchema>;

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export const outboundMessageUpdateSchema = z.object({
  status: outboundMessageStatusSchema.optional(),
  messageId: z.string().trim().max(500).nullable().optional(),
  provider: z.string().trim().max(100).nullable().optional(),
  error: z.string().trim().max(2000).nullable().optional(),
  sentAt: z.string().datetime().nullable().optional(),
  openedAt: z.string().datetime().nullable().optional(),
});

export type OutboundMessageUpdate = z.infer<typeof outboundMessageUpdateSchema>;

/** Result report from the sending pipeline (n8n / provider callback). */
export const outboundSendReportSchema = z.object({
  messageId: uuidSchema,
  status: z.enum(["sent", "failed"]),
  provider: z.string().trim().max(100).nullable().optional(),
  providerMessageId: z.string().trim().max(500).nullable().optional(),
  error: z.string().trim().max(2000).nullable().optional(),
});

export type OutboundSendReport = z.infer<typeof outboundSendReportSchema>;

/** Inbound email reply to a campaign, ingested from the tracking pipeline. */
export const outboundReplySchema = z.object({
  outboundId: uuidSchema,
  messageId: uuidSchema.nullable().optional(),
  threadId: z.string().trim().max(255).nullable().optional(),
  from: z.string().trim().min(1, "From address is required.").max(300),
  subject: z.string().trim().max(500).nullable().optional(),
  body: z.string().trim().min(1, "Reply body is required.").max(10000),
  receivedAt: z.string().datetime().nullable().optional(),
});

export type OutboundReply = z.infer<typeof outboundReplySchema>;

/** Open/delivered pixel or provider webhook for a sent message. */
export const outboundMessageOpenedSchema = z.object({
  messageId: uuidSchema,
  openedAt: z.string().datetime().nullable().optional(),
});

export type OutboundMessageOpened = z.infer<typeof outboundMessageOpenedSchema>;

/** Strict-JSON shape from the DeepSeek reply classifier. */
export const replyClassificationOutputSchema = z.object({
  classification: replyClassificationSchema,
  reason: z.string().trim().max(2000),
  suggested_reply: z.string().trim().max(4000).nullable(),
});

export type ReplyClassificationOutput = z.infer<typeof replyClassificationOutputSchema>;

/* ------------------------------------------------------------------ */
/* Suppression                                                         */
/* ------------------------------------------------------------------ */

export const suppressedContactCreateSchema = z.object({
  email: z.string().trim().email("Enter a valid email.").max(300),
  reason: suppressionReasonSchema,
  sourceOutboundId: uuidSchema.nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

export type SuppressedContactCreate = z.infer<typeof suppressedContactCreateSchema>;
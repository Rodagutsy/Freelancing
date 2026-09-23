import { randomUUID } from "node:crypto";
import { chatJson } from "@/lib/ai/deepseek";
import { buildReplyClassificationMessages } from "@/lib/ai/prompts";
import { replyClassificationOutputSchema } from "@/lib/schemas/outreach";
import type {
  DatabaseClient,
  OutboundMessageRow,
  OutboundRow,
  OutboundStep,
  ReplyClassificationOutput,
  StoredReply,
} from "@/lib/types";
import {
  addSuppressedContact,
  getOutbound,
  getOutboundMessage,
  updateOutboundMessage,
  updateOutboundStatus,
} from "@/lib/services/outreach";
import { getProspect } from "@/lib/services/prospects";

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim();
}

function toSteps(value: unknown): OutboundStep[] {
  return Array.isArray(value) ? (value as OutboundStep[]) : [];
}

function toStoredReplies(value: unknown): StoredReply[] {
  return Array.isArray(value) ? (value as StoredReply[]) : [];
}

/** Classifies an inbound reply against the campaign's sequence. */
export async function classifyReply(
  client: DatabaseClient,
  outbound: OutboundRow,
  input: { from: string; subject: string | null; body: string },
): Promise<ReplyClassificationOutput> {
  const prospect = await getProspect(client, outbound.prospect_id);
  const { system, user } = buildReplyClassificationMessages({
    from: input.from,
    subject: input.subject,
    body: input.body,
    contactName: prospect?.contact_name ?? null,
    companyName: prospect?.company_name ?? "Prospect",
    steps: toSteps(outbound.steps),
  });

  const raw = await chatJson<unknown>(system, user, {
    temperature: 0.1,
    maxTokens: 1000,
  });

  return replyClassificationOutputSchema.parse(raw);
}

/**
 * Ingests an inbound reply: appends it to `outbounds.replies`, flips the
 * campaign to `replied`, auto-classifies with AI, and auto-suppresses on
 * any unsubscribe/do-not-contact signal. AI failure never blocks ingestion.
 */
export async function recordReply(
  client: DatabaseClient,
  input: {
    outboundId: string;
    messageId?: string | null;
    threadId?: string | null;
    from: string;
    subject?: string | null;
    body: string;
    receivedAt?: string | null;
  },
): Promise<{ outbound: OutboundRow; reply: StoredReply }> {
  const outbound = await getOutbound(client, input.outboundId);
  if (!outbound) throw new Error("Outbound not found.");

  let classification: ReplyClassificationOutput | null = null;
  try {
    classification = await classifyReply(client, outbound, {
      from: input.from,
      subject: input.subject ?? null,
      body: input.body,
    });
  } catch {
    classification = null;
  }

  const reply: StoredReply = {
    id: randomUUID(),
    from: input.from,
    subject: input.subject ?? null,
    body: input.body,
    received_at: input.receivedAt ?? new Date().toISOString(),
    classification: classification?.classification ?? null,
    classification_reason: classification?.reason ?? null,
    suggested_reply: classification?.suggested_reply ?? null,
  };

  const existing = toStoredReplies(outbound.replies);
  const patch: Record<string, unknown> = {
    replies: [...existing, reply],
    replied_at: outbound.replied_at ?? reply.received_at,
    status: "replied",
    reply_classification: reply.classification ?? outbound.reply_classification,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("outbounds")
    .update(patch)
    .eq("id", outbound.id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  let updated = data as OutboundRow;

  if (reply.classification === "unsubscribe") {
    await addSuppressedContact(client, {
      email: extractEmail(input.from),
      reason: "replied_stop",
      sourceOutboundId: outbound.id,
      note: `Auto-suppressed from reply: ${reply.classification_reason ?? "unsubscribe request"}`,
    }).catch(() => {});

    const { data: unsub, error: unsubError } = await client
      .from("outbounds")
      .update({ subscribed: false, updated_at: new Date().toISOString() })
      .eq("id", outbound.id)
      .select()
      .single();
    if (unsubError) throw new Error(unsubError.message);
    updated = unsub as OutboundRow;

    updated = await updateOutboundStatus(client, outbound.id, {
      status: "do_not_contact",
    });
  }

  return { outbound: updated, reply };
}

/** Records a delivered/opened event (pixel or provider webhook). */
export async function markMessageOpened(
  client: DatabaseClient,
  messageId: string,
  openedAt?: string,
): Promise<OutboundMessageRow> {
  const message = await getOutboundMessage(client, messageId);
  if (!message) throw new Error("Message not found.");
  if (message.status === "draft" || message.status === "queued") {
    throw new Error("Message has not been sent yet.");
  }

  return updateOutboundMessage(client, message.id, {
    status: "opened",
    openedAt: openedAt ?? new Date().toISOString(),
  });
}
import {
  assertContactable,
  createOutboundMessage,
  getOutbound,
  getOutboundMessage,
  listOutboundMessages,
  updateOutboundMessage,
  updateOutboundStatus,
} from "@/lib/services/outreach";
import type {
  DatabaseClient,
  OutboundMessageFeedRow,
  OutboundMessageRow,
  OutboundRow,
} from "@/lib/types";

const FOLLOW_UP_QUEUEABLE = ["sent", "replied", "follow_up_1", "follow_up_2"];

/**
 * Marks the next due email as `queued` and moves the campaign to `sending`.
 * The actual SMTP send is done by the n8n pipeline (or by `markMessageSent`
 * for manual testing). With `followUp: true` the campaign must already be in
 * progress (`sent`/`replied`/`follow_up_1`/`follow_up_2`); otherwise it must
 * be `approved` for the initial send.
 */
export async function queueOutboundStep(
  client: DatabaseClient,
  outboundId: string,
  opts: { followUp?: boolean } = {},
): Promise<{ outbound: OutboundRow; message: OutboundMessageRow }> {
  const outbound = await getOutbound(client, outboundId);
  if (!outbound) throw new Error("Outbound not found.");

  const allowed = opts.followUp ? FOLLOW_UP_QUEUEABLE : ["approved"];
  if (!allowed.includes(outbound.status)) {
    const label = opts.followUp
      ? "Only outbounds already in progress can queue follow-ups."
      : "Only approved outbounds can be queued for sending.";
    throw new Error(label);
  }

  // Compliance hard-stop: never queue a prospect that has since been
  // suppressed (unsubscribe, manual block, bounce, or legal hold).
  await assertContactable(client, outbound.prospect_id);

  const steps = [...outbound.steps].sort((a, b) => a.order - b.order);
  if (steps.length === 0) throw new Error("This outbound has no email steps.");
  if (outbound.current_step >= steps.length) {
    throw new Error("All emails in this campaign have already been sent.");
  }
  const target = steps[outbound.current_step];

  const messages = await listOutboundMessages(client, outbound.id);
  let message = messages.find((m) => m.step_no === target.order) ?? null;

  if (!message) {
    message = await createOutboundMessage(client, {
      outboundId: outbound.id,
      stepNo: target.order,
      subject: target.subject,
      body: target.body,
      status: "queued",
    });
  } else if (message.status === "draft") {
    message = await updateOutboundMessage(client, message.id, { status: "queued" });
  }

  const updated = await updateOutboundStatus(client, outbound.id, {
    status: "sending",
  });

  return { outbound: updated, message };
}

/**
 * Marks the next due email of an approved campaign as `queued` and moves
 * the campaign to `sending`. Alias for initial sends (see `queueOutboundStep`).
 */
export async function queueOutboundForSend(
  client: DatabaseClient,
  outboundId: string,
): Promise<{ outbound: OutboundRow; message: OutboundMessageRow }> {
  return queueOutboundStep(client, outboundId, { followUp: false });
}

/**
 * Records that a queued message was actually sent (by n8n, a provider
 * callback, or the manual confirmation action) and advances the campaign.
 * Campaign status rolls with the sequence: email 1 → `sent`, email 2 →
 * `follow_up_1`, emails 3+ → `follow_up_2`, final email → `done`.
 */
export async function markMessageSent(
  client: DatabaseClient,
  messageId: string,
  opts: { provider?: string | null; providerMessageId?: string | null } = {},
): Promise<{ outbound: OutboundRow; message: OutboundMessageRow }> {
  const message = await getOutboundMessage(client, messageId);
  if (!message) throw new Error("Message not found.");

  const outbound = await getOutbound(client, message.outbound_id);
  if (!outbound) throw new Error("Outbound not found.");

  // Idempotent: a repeated callback (provider retry) is a no-op.
  if (message.status === "sent") {
    return { outbound, message };
  }

  const sent = await updateOutboundMessage(client, message.id, {
    status: "sent",
    provider: opts.provider ?? null,
    messageId: opts.providerMessageId ?? null,
    sentAt: new Date().toISOString(),
  });

  const steps = [...outbound.steps].sort((a, b) => a.order - b.order);
  const emailsSent = message.step_no;
  let status: OutboundRow["status"] = "sent";
  if (emailsSent >= steps.length) status = "done";
  else if (emailsSent === 2) status = "follow_up_1";
  else if (emailsSent >= 3) status = "follow_up_2";

  const updated = await updateOutboundStatus(client, outbound.id, {
    status,
    currentStep: Math.min(emailsSent, steps.length),
  });

  return { outbound: updated, message: sent };
}

/** Records a permanent failure for the current send attempt. */
export async function markMessageFailed(
  client: DatabaseClient,
  messageId: string,
  error: string,
): Promise<{ outbound: OutboundRow; message: OutboundMessageRow }> {
  const message = await getOutboundMessage(client, messageId);
  if (!message) throw new Error("Message not found.");

  const outbound = await getOutbound(client, message.outbound_id);
  if (!outbound) throw new Error("Outbound not found.");

  const failed = await updateOutboundMessage(client, message.id, {
    status: "failed",
    error: error.slice(0, 2000),
  });

  let updated = outbound;
  if (outbound.status === "sending") {
    updated = await updateOutboundStatus(client, outbound.id, { status: "failed" });
  }

  return { outbound: updated, message: failed };
}

/** Polling feed for the n8n sender: everything currently waiting to be sent. */
export async function getQueuedMessages(
  client: DatabaseClient,
  opts: { limit?: number } = {},
): Promise<OutboundMessageFeedRow[]> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const { data, error } = await client
    .from("outbound_message_feed")
    .select("*")
    .eq("message_status", "queued")
    .order("message_created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as OutboundMessageFeedRow[];
}

/**
 * When the next follow-up is due to go out, based on the most recently sent
 * email (`lastSentAt`) plus the next step's `day_offset`. Returns null when
 * the next step is unknown or the campaign has no more emails to send.
 */
export function getNextFollowUpDue(
  outbound: OutboundRow,
  lastSentAt: string | null,
): string | null {
  const steps = [...outbound.steps].sort((a, b) => a.order - b.order);
  const next = steps[outbound.current_step] ?? null;
  if (!next || outbound.current_step >= steps.length || !lastSentAt) return null;

  const offsetDays = Math.max(0, next.day_offset ?? 1);
  const due = new Date(lastSentAt).getTime() + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(due).toISOString();
}
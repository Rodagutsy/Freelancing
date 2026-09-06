import type {
  DatabaseClient,
  EmailSequenceRow,
  OutboundCreate,
  OutboundFeedRow,
  OutboundMessageRow,
  OutboundMessageStatus,
  OutboundMessageUpdate,
  OutboundRow,
  OutboundStatus,
  OutboundStatusUpdate,
  OutboundStep,
  SuppressedContactCreate,
  SuppressedContactRow,
} from "@/lib/types";

/** Emails are always stored lowercase/trimmed so suppression matching is exact. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Outbounds                                                           */
/* ------------------------------------------------------------------ */

export async function createOutbound(
  client: DatabaseClient,
  input: OutboundCreate,
): Promise<OutboundRow> {
  await assertContactable(client, input.prospectId);

  // One active campaign per prospect.
  const { data: active, error: activeError } = await client
    .from("outbounds")
    .select("id")
    .eq("prospect_id", input.prospectId)
    .in("status", ["researching", "pitch_drafted", "need_approval", "approved", "sending", "sent", "replied", "follow_up_1", "follow_up_2"]);

  if (activeError) throw new Error(activeError.message);
  if (active != null && active.length > 0) {
    throw new Error("This prospect already has an active outreach campaign.");
  }

  const { data, error } = await client
    .from("outbounds")
    .insert({
      prospect_id: input.prospectId,
      email_sequence_id: input.emailSequenceId ?? null,
      status: input.status ?? "pitch_drafted",
      steps: input.steps,
      personalization_angle: input.personalizationAngle ?? null,
      confidence: input.confidence ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutboundRow;
}

/**
 * Creates a campaign and seeds a draft message row for every step.
 * Steps are validated by the caller against the outbound steps schema.
 */
export async function createOutboundWithMessages(
  client: DatabaseClient,
  input: {
    prospectId: string;
    emailSequenceId?: string | null;
    steps: OutboundStep[];
    personalizationAngle?: string | null;
    confidence?: number | null;
    status?: OutboundStatus;
  },
): Promise<{ outbound: OutboundRow; messages: OutboundMessageRow[] }> {
  const outbound = await createOutbound(client, {
    prospectId: input.prospectId,
    emailSequenceId: input.emailSequenceId ?? null,
    steps: input.steps,
    personalizationAngle: input.personalizationAngle ?? null,
    confidence: input.confidence ?? null,
    status: input.status ?? "pitch_drafted",
  });

  const messages: OutboundMessageRow[] = [];
  for (const step of [...input.steps].sort((a, b) => a.order - b.order)) {
    messages.push(
      await createOutboundMessage(client, {
        outboundId: outbound.id,
        stepNo: step.order,
        subject: step.subject,
        body: step.body,
        status: "draft",
      }),
    );
  }

  return { outbound, messages };
}

export async function getOutbound(
  client: DatabaseClient,
  outboundId: string,
): Promise<OutboundRow | null> {
  const { data, error } = await client
    .from("outbounds")
    .select("*")
    .eq("id", outboundId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OutboundRow | null) ?? null;
}

export async function getProspectOutbound(
  client: DatabaseClient,
  prospectId: string,
): Promise<OutboundRow | null> {
  const { data, error } = await client
    .from("outbounds")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OutboundRow | null) ?? null;
}

export async function listOutbounds(
  client: DatabaseClient,
  opts: { limit?: number; offset?: number; status?: OutboundStatus } = {},
): Promise<{ items: OutboundRow[]; total: number }> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const offset = Math.max(0, opts.offset ?? 0);

  let q = client.from("outbounds").select("*", { count: "exact" });
  if (opts.status) q = q.eq("status", opts.status);
  q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as OutboundRow[], total: count ?? 0 };
}

export async function updateOutboundStatus(
  client: DatabaseClient,
  outboundId: string,
  input: OutboundStatusUpdate,
): Promise<OutboundRow> {
  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.approvalNote !== undefined)
    patch.approval_note = input.approvalNote || null;
  if (input.currentStep !== undefined && input.currentStep !== null)
    patch.current_step = Math.max(0, input.currentStep);
  if (["sent", "follow_up_1", "follow_up_2", "done"].includes(input.status))
    patch.sent_at = new Date().toISOString();
  if (input.status === "replied") patch.replied_at = new Date().toISOString();

  const { data, error } = await client
    .from("outbounds")
    .update(patch)
    .eq("id", outboundId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutboundRow;
}

/** Replaces the campaign steps (bumps version for edit/regenerate history). */
export async function setOutboundSteps(
  client: DatabaseClient,
  outboundId: string,
  steps: OutboundStep[],
  personalizationAngle?: string | null,
): Promise<OutboundRow> {
  const existing = await getOutbound(client, outboundId);
  if (!existing) throw new Error("Outbound campaign not found.");

  const patch: Record<string, unknown> = {
    steps,
    personalization_angle:
      personalizationAngle === undefined
        ? existing.personalization_angle
        : personalizationAngle,
    version: existing.version + 1,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("outbounds")
    .update(patch)
    .eq("id", outboundId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutboundRow;
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export async function createOutboundMessage(
  client: DatabaseClient,
  input: {
    outboundId: string;
    stepNo: number;
    subject: string;
    body: string;
    status?: OutboundMessageStatus;
  },
): Promise<OutboundMessageRow> {
  const { data, error } = await client
    .from("outbound_messages")
    .insert({
      outbound_id: input.outboundId,
      step_no: input.stepNo,
      subject: input.subject,
      body: input.body,
      status: input.status ?? "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutboundMessageRow;
}

export async function listOutboundMessages(
  client: DatabaseClient,
  outboundId: string,
): Promise<OutboundMessageRow[]> {
  const { data, error } = await client
    .from("outbound_messages")
    .select("*")
    .eq("outbound_id", outboundId)
    .order("step_no", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as OutboundMessageRow[];
}

export async function getOutboundMessage(
  client: DatabaseClient,
  messageId: string,
): Promise<OutboundMessageRow | null> {
  const { data, error } = await client
    .from("outbound_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OutboundMessageRow | null) ?? null;
}

export async function updateOutboundMessage(
  client: DatabaseClient,
  messageId: string,
  patch: OutboundMessageUpdate,
): Promise<OutboundMessageRow> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.messageId !== undefined) update.message_id = patch.messageId || null;
  if (patch.provider !== undefined) update.provider = patch.provider || null;
  if (patch.error !== undefined) update.error = patch.error || null;
  if (patch.sentAt !== undefined) update.sent_at = patch.sentAt || null;
  if (patch.openedAt !== undefined) update.opened_at = patch.openedAt || null;

  const { data, error } = await client
    .from("outbound_messages")
    .update(update)
    .eq("id", messageId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutboundMessageRow;
}

/* ------------------------------------------------------------------ */
/* Suppression / compliance                                            */
/* ------------------------------------------------------------------ */

export async function isEmailSuppressed(
  client: DatabaseClient,
  email: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("suppressed_contacts")
    .select("id")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null;
}

export async function addSuppressedContact(
  client: DatabaseClient,
  input: SuppressedContactCreate,
): Promise<SuppressedContactRow> {
  const email = normalizeEmail(input.email);

  const existing = await isEmailSuppressed(client, email);
  if (existing) {
    // Idempotent — the contact is already suppressed.
    const { data: row, error } = await client
      .from("suppressed_contacts")
      .select("*")
      .eq("email", email)
      .single();
    if (error) throw new Error(error.message);
    return row as SuppressedContactRow;
  }

  const { data, error } = await client
    .from("suppressed_contacts")
    .insert({
      email,
      reason: input.reason,
      source_outbound_id: input.sourceOutboundId ?? null,
      note: input.note ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SuppressedContactRow;
}

export async function removeSuppressedContact(
  client: DatabaseClient,
  suppressedId: string,
): Promise<void> {
  const { error } = await client
    .from("suppressed_contacts")
    .delete()
    .eq("id", suppressedId);
  if (error) throw new Error(error.message);
}

export async function listSuppressedContacts(
  client: DatabaseClient,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ items: SuppressedContactRow[]; total: number }> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const offset = Math.max(0, opts.offset ?? 0);

  const { data, count, error } = await client
    .from("suppressed_contacts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return { items: (data ?? []) as SuppressedContactRow[], total: count ?? 0 };
}

/**
 * Guard used before any outbound is created or sent: the prospect must exist,
 * have a contact email, and that email must not be on the suppression list.
 */
export async function assertContactable(
  client: DatabaseClient,
  prospectId: string,
): Promise<{ email: string }> {
  const { data, error } = await client
    .from("prospects")
    .select("id, contact_email, contact_type")
    .eq("id", prospectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Prospect not found.");

  const email = (data.contact_email ?? "").trim();
  if (!email) {
    throw new Error("This prospect has no contact email yet.");
  }

  if (await isEmailSuppressed(client, email)) {
    const { data: suppressed } = await client
      .from("suppressed_contacts")
      .select("reason")
      .eq("email", normalizeEmail(email))
      .maybeSingle();

    const reason = (suppressed?.reason as string | undefined) ?? "suppressed";
    throw new Error(
      `Contact is suppressed (${reason}). Add them back or remove the suppression to continue.`,
    );
  }

  return { email };
}

/* ------------------------------------------------------------------ */
/* Sequences (templates)                                               */
/* ------------------------------------------------------------------ */

export async function getEmailSequence(
  client: DatabaseClient,
  sequenceId: string,
): Promise<EmailSequenceRow | null> {
  const { data, error } = await client
    .from("email_sequences")
    .select("*")
    .eq("id", sequenceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as EmailSequenceRow | null) ?? null;
}

export async function getEmailSequenceByName(
  client: DatabaseClient,
  name: string,
): Promise<EmailSequenceRow | null> {
  const { data, error } = await client
    .from("email_sequences")
    .select("*")
    .eq("name", name)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as EmailSequenceRow | null) ?? null;
}

export async function createEmailSequence(
  client: DatabaseClient,
  input: {
    name: string;
    description?: string | null;
    steps: OutboundStep[];
  },
): Promise<EmailSequenceRow> {
  const { data, error } = await client
    .from("email_sequences")
    .insert({
      name: input.name,
      description: input.description ?? null,
      steps: input.steps,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EmailSequenceRow;
}

export async function listEmailSequences(
  client: DatabaseClient,
): Promise<EmailSequenceRow[]> {
  const { data, error } = await client
    .from("email_sequences")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as EmailSequenceRow[];
}

/* ------------------------------------------------------------------ */
/* Read-model feed                                                     */
/* ------------------------------------------------------------------ */

export async function listOutboundFeed(
  client: DatabaseClient,
  opts: { limit?: number; offset?: number; status?: OutboundStatus } = {},
): Promise<{ items: OutboundFeedRow[]; total: number }> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const offset = Math.max(0, opts.offset ?? 0);

  let q = client.from("outbound_feed").select("*", { count: "exact" });
  if (opts.status) q = q.eq("status", opts.status);
  q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as OutboundFeedRow[], total: count ?? 0 };
}
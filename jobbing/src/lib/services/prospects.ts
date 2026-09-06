import type {
  DatabaseClient,
  PipelineStatus,
  ProspectCreateInput,
  ProspectRow,
  ProspectUpdateInput,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

export async function createProspect(
  client: DatabaseClient,
  input: ProspectCreateInput,
): Promise<ProspectRow> {
  const { data, error } = await client
    .from("prospects")
    .insert({
      company_name: input.company_name,
      website_url: input.website_url ?? null,
      industry: input.industry ?? null,
      location: input.location ?? null,
      contact_name: input.contact_name ?? null,
      contact_email: input.contact_email || null,
      contact_phone: input.contact_phone ?? null,
      source: input.source ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProspectRow;
}

export async function getProspect(
  client: DatabaseClient,
  prospectId: string,
): Promise<ProspectRow | null> {
  const { data, error } = await client
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ProspectRow | null) ?? null;
}

export async function listProspects(
  client: DatabaseClient,
  opts: {
    limit?: number;
    offset?: number;
    status?: PipelineStatus;
  } = {},
): Promise<{ items: ProspectRow[]; total: number }> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const offset = Math.max(0, opts.offset ?? 0);

  let q = client.from("prospects").select("*", { count: "exact" });
  if (opts.status) q = q.eq("pipeline_status", opts.status);
  q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as ProspectRow[], total: count ?? 0 };
}

export async function updateProspect(
  client: DatabaseClient,
  prospectId: string,
  input: ProspectUpdateInput,
): Promise<ProspectRow> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.company_name !== undefined) patch.company_name = input.company_name;
  if (input.website_url !== undefined) patch.website_url = input.website_url;
  if (input.industry !== undefined) patch.industry = input.industry;
  if (input.location !== undefined) patch.location = input.location;
  if (input.contact_name !== undefined) patch.contact_name = input.contact_name;
  if (input.contact_email !== undefined) patch.contact_email = input.contact_email || null;
  if (input.contact_phone !== undefined) patch.contact_phone = input.contact_phone;
  if (input.source !== undefined) patch.source = input.source;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.pipeline_status !== undefined) patch.pipeline_status = input.pipeline_status;

  const { data, error } = await client
    .from("prospects")
    .update(patch)
    .eq("id", prospectId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProspectRow;
}

export async function deleteProspect(
  client: DatabaseClient,
  prospectId: string,
): Promise<void> {
  const { error } = await client.from("prospects").delete().eq("id", prospectId);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Audit linking                                                       */
/* ------------------------------------------------------------------ */

export async function linkAuditToProspect(
  client: DatabaseClient,
  prospectId: string,
  auditId: string,
  isPrimary = false,
): Promise<void> {
  // If marking as primary, unset other primaries first
  if (isPrimary) {
    await client
      .from("prospect_audits")
      .update({ is_primary: false })
      .eq("prospect_id", prospectId);
  }

  const { error } = await client
    .from("prospect_audits")
    .upsert(
      { prospect_id: prospectId, audit_id: auditId, is_primary: isPrimary },
      { onConflict: "prospect_id,audit_id" },
    );

  if (error) throw new Error(error.message);
}

export async function unlinkAuditFromProspect(
  client: DatabaseClient,
  prospectId: string,
  auditId: string,
): Promise<void> {
  const { error } = await client
    .from("prospect_audits")
    .delete()
    .eq("prospect_id", prospectId)
    .eq("audit_id", auditId);

  if (error) throw new Error(error.message);
}

export async function getProspectAudits(
  client: DatabaseClient,
  prospectId: string,
): Promise<Array<{ audit_id: string; is_primary: boolean; created_at: string }>> {
  const { data, error } = await client
    .from("prospect_audits")
    .select("audit_id, is_primary, created_at")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ audit_id: string; is_primary: boolean; created_at: string }>;
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export async function getProspectStats(
  client: DatabaseClient,
): Promise<{ total: number; byStatus: Record<string, number> }> {
  const { count } = await client
    .from("prospects")
    .select("*", { count: "exact", head: true });

  const statuses = [
    "prospecting",
    "contacted",
    "proposal_sent",
    "negotiating",
    "won",
    "lost",
  ];
  const byStatus: Record<string, number> = {};
  for (const s of statuses) {
    const { count: c } = await client
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_status", s);
    byStatus[s] = c ?? 0;
  }

  return { total: count ?? 0, byStatus };
}

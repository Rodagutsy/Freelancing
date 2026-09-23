import type {
  AuditCreateInput,
  AuditStatus,
  AuditRow,
  AuditPageRow,
  AuditTechnologyRow,
  AuditIssueRow,
  AuditOpportunityRow,
  AuditOpportunityServiceRow,
  DatabaseClient,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

export async function createAudit(
  client: DatabaseClient,
  input: AuditCreateInput,
): Promise<AuditRow> {
  const { data, error } = await client
    .from("audits")
    .insert({
      url: input.url,
      business_name: input.business_name ?? null,
      industry: input.industry ?? null,
      location: input.location ?? null,
      status: "created",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AuditRow;
}

export async function getAudit(
  client: DatabaseClient,
  auditId: string,
): Promise<AuditRow | null> {
  const { data, error } = await client
    .from("audits")
    .select("*")
    .eq("id", auditId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AuditRow | null) ?? null;
}

export async function listAudits(
  client: DatabaseClient,
  opts: { limit?: number; offset?: number; status?: AuditStatus } = {},
): Promise<{ items: AuditRow[]; total: number }> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const offset = Math.max(0, opts.offset ?? 0);

  let q = client.from("audits").select("*", { count: "exact" });
  if (opts.status) q = q.eq("status", opts.status);
  q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as AuditRow[], total: count ?? 0 };
}

export async function deleteAudit(
  client: DatabaseClient,
  auditId: string,
): Promise<void> {
  const { error } = await client.from("audits").delete().eq("id", auditId);
  if (error) throw new Error(error.message);
}

export async function getAuditStats(
  client: DatabaseClient,
): Promise<{ total: number; inProgress: number; completed: number; failed: number }> {
  const active = [
    "created",
    "queued",
    "crawling",
    "analyzing",
    "scoring",
    "opportunities",
  ];
  const [total, inProgress, completed, failed] = await Promise.all([
    client.from("audits").select("*", { count: "exact", head: true }),
    client.from("audits").select("*", { count: "exact", head: true }).in("status", active),
    client
      .from("audits")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    client.from("audits").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  return {
    total: total.count ?? 0,
    inProgress: inProgress.count ?? 0,
    completed: completed.count ?? 0,
    failed: failed.count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Status management                                                   */
/* ------------------------------------------------------------------ */

export async function updateAuditStatus(
  client: DatabaseClient,
  auditId: string,
  status: AuditStatus,
  extra?: Record<string, unknown>,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (extra) Object.assign(patch, extra);

  const { error } = await client
    .from("audits")
    .update(patch)
    .eq("id", auditId);

  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export async function upsertAuditPage(
  client: DatabaseClient,
  page: Omit<AuditPageRow, "id"> & { id?: string },
): Promise<AuditPageRow> {
  const { data, error } = await client
    .from("audit_pages")
    .upsert(page, { onConflict: "audit_id,path" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AuditPageRow;
}

export async function getAuditPages(
  client: DatabaseClient,
  auditId: string,
): Promise<AuditPageRow[]> {
  const { data, error } = await client
    .from("audit_pages")
    .select("*")
    .eq("audit_id", auditId)
    .order("path", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AuditPageRow[];
}

/* ------------------------------------------------------------------ */
/* Technologies                                                        */
/* ------------------------------------------------------------------ */

export async function insertAuditTechnologies(
  client: DatabaseClient,
  auditId: string,
  techs: Array<{ name: string; category: string; confidence: number; evidence?: string }>,
): Promise<void> {
  if (techs.length === 0) return;
  const { error } = await client.from("audit_technologies").insert(
    techs.map((t) => ({
      audit_id: auditId,
      name: t.name,
      category: t.category,
      confidence: t.confidence,
      evidence: t.evidence ?? null,
    })),
  );
  if (error) throw new Error(error.message);
}

export async function getAuditTechnologies(
  client: DatabaseClient,
  auditId: string,
): Promise<AuditTechnologyRow[]> {
  const { data, error } = await client
    .from("audit_technologies")
    .select("*")
    .eq("audit_id", auditId)
    .order("confidence", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AuditTechnologyRow[];
}

/* ------------------------------------------------------------------ */
/* Issues                                                              */
/* ------------------------------------------------------------------ */

export async function insertAuditIssues(
  client: DatabaseClient,
  auditId: string,
  issues: Array<
    Omit<AuditIssueRow, "id" | "audit_id" | "created_at"> & { page_id?: string }
  >,
): Promise<void> {
  if (issues.length === 0) return;
  const { error } = await client.from("audit_issues").insert(
    issues.map((i) => ({
      audit_id: auditId,
      page_id: i.page_id ?? null,
      category: i.category,
      severity: i.severity,
      title: i.title,
      description: i.description,
      evidence: i.evidence ?? null,
      recommendation: i.recommendation ?? null,
      classification: i.classification,
    })),
  );
  if (error) throw new Error(error.message);
}

export async function getAuditIssues(
  client: DatabaseClient,
  auditId: string,
): Promise<AuditIssueRow[]> {
  const { data, error } = await client
    .from("audit_issues")
    .select("*")
    .eq("audit_id", auditId)
    .order("severity", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AuditIssueRow[];
}

/* ------------------------------------------------------------------ */
/* Opportunities                                                       */
/* ------------------------------------------------------------------ */

export async function insertAuditOpportunities(
  client: DatabaseClient,
  auditId: string,
  opps: Array<
    Omit<AuditOpportunityRow, "id" | "audit_id" | "created_at"> & {
      services?: Array<{ service_name: string; service_description?: string; estimated_hours?: number }>;
    }
  >,
): Promise<AuditOpportunityRow[]> {
  if (opps.length === 0) return [];
  const results: AuditOpportunityRow[] = [];

  for (const opp of opps) {
    const { services, ...oppData } = opp;
    const { data, error } = await client
      .from("audit_opportunities")
      .insert({
        audit_id: auditId,
        ...oppData,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    const row = data as AuditOpportunityRow;

    if (services && services.length > 0) {
      const { error: svcErr } = await client.from("audit_opportunity_services").insert(
        services.map((s) => ({
          opportunity_id: row.id,
          service_name: s.service_name,
          service_description: s.service_description ?? null,
          estimated_hours: s.estimated_hours ?? null,
        })),
      );
      if (svcErr) throw new Error(svcErr.message);
    }

    results.push(row);
  }
  return results;
}

export async function getAuditOpportunities(
  client: DatabaseClient,
  auditId: string,
): Promise<AuditOpportunityRow[]> {
  const { data, error } = await client
    .from("audit_opportunities")
    .select("*")
    .eq("audit_id", auditId)
    .order("score", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AuditOpportunityRow[];
}

export async function getOpportunityServices(
  client: DatabaseClient,
  opportunityId: string,
): Promise<AuditOpportunityServiceRow[]> {
  const { data, error } = await client
    .from("audit_opportunity_services")
    .select("*")
    .eq("opportunity_id", opportunityId);

  if (error) throw new Error(error.message);
  return (data ?? []) as AuditOpportunityServiceRow[];
}

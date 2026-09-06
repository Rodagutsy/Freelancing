import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { deleteAudit, getAudit, getAuditIssues, getAuditOpportunities, getAuditPages, getAuditTechnologies } from "@/lib/services/audits";
import { getOpportunityServices } from "@/lib/services/audits";
import { uuidSchema } from "@/lib/schemas/common";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid audit id." }, { status: 400 });
  }

  const supabase = await createClient();
  const audit = await getAudit(supabase, parsedId.data);
  if (!audit) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }

  const [pages, techs, issues, opps] = await Promise.all([
    getAuditPages(supabase, id),
    getAuditTechnologies(supabase, id),
    getAuditIssues(supabase, id),
    getAuditOpportunities(supabase, id),
  ]);

  const oppsWithServices = await Promise.all(
    opps.map(async (o) => ({
      ...o,
      services: await getOpportunityServices(supabase, o.id),
    })),
  );

  return NextResponse.json({
    ...audit,
    pages,
    technologies: techs,
    issues,
    opportunities: oppsWithServices,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid audit id." }, { status: 400 });
  }

  const supabase = await createClient();
  await deleteAudit(supabase, parsedId.data);
  return NextResponse.json({ ok: true });
}

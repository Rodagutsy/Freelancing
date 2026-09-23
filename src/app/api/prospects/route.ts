import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { prospectCreateSchema } from "@/lib/schemas/audit";
import { createProspect, listProspects, getProspectStats } from "@/lib/services/prospects";

export async function GET(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const supabase = await createClient();
  const result = await listProspects(supabase, { status: status as never, limit, offset });
  const stats = await getProspectStats(supabase);
  return NextResponse.json({ ...result, stats });
}

export async function POST(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = prospectCreateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  const prospect = await createProspect(supabase, parsed.data);
  return NextResponse.json(prospect, { status: 201 });
}

import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas/common";
import { getJobDetail } from "@/lib/services/jobs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return errorResponse(parsedId.error);

  const supabase = await createClient();
  const job = await getJobDetail(supabase, parsedId.data);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  return NextResponse.json(job);
}
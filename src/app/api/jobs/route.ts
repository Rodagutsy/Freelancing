import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { jobFiltersSchema } from "@/lib/schemas/job";
import { listJobs } from "@/lib/services/jobs";

export async function GET(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);

  const parsed = jobFiltersSchema.safeParse({
    ...Object.fromEntries(url.searchParams),
    skills: url.searchParams.get("skills")
      ? url.searchParams
          .get("skills")!
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
  });

  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  const result = await listJobs(supabase, parsed.data);
  return NextResponse.json(result);
}
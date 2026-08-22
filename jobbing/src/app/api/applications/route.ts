import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { applicationCreateSchema } from "@/lib/schemas/application";
import { listApplications, createApplication } from "@/lib/services/applications";

export async function GET() {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const supabase = await createClient();
  const applications = await listApplications(supabase);
  return NextResponse.json(applications);
}

export async function POST(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse(new Error("Invalid JSON body."));
  }

  const parsed = applicationCreateSchema.safeParse(input);
  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  try {
    const application = await createApplication(supabase, parsed.data);
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
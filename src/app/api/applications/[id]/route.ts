import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas/common";
import { applicationUpdateSchema } from "@/lib/schemas/application";
import { updateApplication } from "@/lib/services/applications";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return errorResponse(parsedId.error);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse(new Error("Invalid JSON body."));
  }

  const parsed = applicationUpdateSchema.safeParse(input);
  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  try {
    const application = await updateApplication(supabase, parsedId.data, parsed.data);
    return NextResponse.json(application);
  } catch (error) {
    return errorResponse(error);
  }
}
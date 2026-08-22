import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { profileInputSchema } from "@/lib/schemas/profile";
import { getProfile, upsertProfile } from "@/lib/services/settings";

export async function GET() {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const supabase = await createClient();
  const profile = await getProfile(supabase);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse(new Error("Invalid JSON body."));
  }

  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  try {
    const profile = await upsertProfile(supabase, parsed.data);
    return NextResponse.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
}
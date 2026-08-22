import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { profileInputSchema } from "@/lib/schemas/profile";
import { getDefaultProfile, getProfiles, upsertProfile } from "@/lib/services/settings";

export async function GET(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const supabase = await createClient();
  const url = new URL(request.url);

  if (url.searchParams.get("default") === "true") {
    const profile = await getDefaultProfile(supabase);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json(profile);
  }

  const profiles = await getProfiles(supabase);
  return NextResponse.json(profiles);
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

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return errorResponse(new Error("Persona id is required (?id=...)."));
  }

  const supabase = await createClient();
  try {
    const profile = await upsertProfile(supabase, parsed.data, id);
    return NextResponse.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
}

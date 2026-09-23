import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export async function requireApiUser() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 },
    );
  }
  return null;
}

export function errorResponse(error: unknown, status = 400) {
  const message =
    error instanceof z.ZodError
      ? error.issues.map((i) => i.message).join(", ")
      : "Something went wrong.";
  return NextResponse.json({ error: message }, { status });
}
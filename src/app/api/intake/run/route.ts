import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { runAtsIntake } from "@/lib/services/atsIntake";
import { getIntakeRunOptions } from "@/lib/services/intakeOptions";

/*
 * ATS intake runner.
 *
 * Two ways in:
 *   1. Vercel Cron (daily safety net) or any external scheduler sends
 *      `Authorization: Bearer $CRON_SECRET`. Runs with the service-role
 *      client across every user's active boards.
 *   2. A signed-in user hits it from the "Run intake now" button (session
 *      client, RLS scopes it to their own companies).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const isCron = !!cronSecret && auth === `Bearer ${cronSecret}`;

  try {
    if (isCron) {
      const admin = createAdminClient();
      const summary = await runAtsIntake(admin, getIntakeRunOptions("cron"));
      return NextResponse.json({ ok: true, mode: "cron", ...summary });
    }

    const unauthorized = await requireApiUser();
    if (unauthorized) return unauthorized;

    const supabase = await createClient();
    const summary = await runAtsIntake(supabase, getIntakeRunOptions("manual"));
    return NextResponse.json({ ok: true, mode: "manual", ...summary });
  } catch (error) {
    return errorResponse(error);
  }
}

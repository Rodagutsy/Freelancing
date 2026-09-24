import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { postWebhook, requireWebhookConfig } from "@/lib/security/webhook";
import { createClient } from "@/lib/supabase/server";
import { auditCreateSchema } from "@/lib/schemas/audit";
import { createAudit, listAudits } from "@/lib/services/audits";

export async function GET(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const supabase = await createClient();
  const result = await listAudits(supabase, { status: status as never, limit, offset });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = auditCreateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  const audit = await createAudit(supabase, parsed.data);

  const webhook = requireWebhookConfig("AUDIT");
  try {
    await postWebhook(webhook, { audit_id: audit.id, url: parsed.data.url });
  } catch (error) {
    await supabase
      .from("audits")
      .update({
        error_message: error instanceof Error ? error.message : "Webhook unavailable.",
      })
      .eq("id", audit.id);
  }

  return NextResponse.json(audit, { status: 201 });
}

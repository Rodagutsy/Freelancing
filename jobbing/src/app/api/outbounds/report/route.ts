import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { outboundSendReportSchema } from "@/lib/schemas/outreach";
import { markMessageSent, markMessageFailed } from "@/lib/services/outboundSend";

/*
 * Callback for the sending pipeline (n8n / provider).
 * Authenticates via the n8n webhook shared secret, or a dashboard session.
 */
export async function POST(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const hasWebhookSecret = !!secret && auth === `Bearer ${secret}`;
  if (!hasWebhookSecret) {
    const unauthorized = await requireApiUser();
    if (unauthorized) return unauthorized;
  }

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse(new Error("Invalid JSON body."));

  const parsed = outboundSendReportSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  try {
    if (parsed.data.status === "failed") {
      await markMessageFailed(
        supabase,
        parsed.data.messageId,
        parsed.data.error ?? "Send failed.",
      );
      return NextResponse.json({ ok: true, status: "failed" });
    }

    const { message } = await markMessageSent(supabase, parsed.data.messageId, {
      provider: parsed.data.provider ?? null,
      providerMessageId: parsed.data.providerMessageId ?? null,
    });
    return NextResponse.json({ ok: true, status: message.status });
  } catch (error) {
    return errorResponse(error);
  }
}
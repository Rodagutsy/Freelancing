import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { outboundReplySchema, outboundMessageOpenedSchema } from "@/lib/schemas/outreach";
import { recordReply, markMessageOpened } from "@/lib/services/outboundTracking";

/*
 * Ingestion for tracking events (opens + replies).
 * Authenticates via the n8n webhook shared secret, or a dashboard session.
 *
 *   { event: "opened", messageId, openedAt? }
 *   { event: "reply", ...outboundReplySchema }
 */
const trackSchema = z.discriminatedUnion("event", [
  outboundMessageOpenedSchema.extend({ event: z.literal("opened") }),
  outboundReplySchema.extend({ event: z.literal("reply") }),
]);

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

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  try {
    if (parsed.data.event === "opened") {
      await markMessageOpened(supabase, parsed.data.messageId, parsed.data.openedAt ?? undefined);
      return NextResponse.json({ ok: true, event: "opened" });
    }

    const { outbound, reply } = await recordReply(supabase, parsed.data);
    return NextResponse.json({
      ok: true,
      event: "reply",
      outboundId: outbound.id,
      replyId: reply.id,
      classification: reply.classification,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
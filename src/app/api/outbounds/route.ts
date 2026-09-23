import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { outboundCreateSchema } from "@/lib/schemas/outreach";
import { listOutboundFeed, createOutboundWithMessages } from "@/lib/services/outreach";

export async function GET(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const supabase = await createClient();
  try {
    const result = await listOutboundFeed(supabase, {
      status: status as never,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/** Creates an outbound campaign + draft messages from a sequence template (no AI). */
export async function POST(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse(new Error("Invalid JSON body."));

  const parsed = outboundCreateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  try {
    const { outbound, messages } = await createOutboundWithMessages(supabase, {
      prospectId: parsed.data.prospectId,
      emailSequenceId: parsed.data.emailSequenceId ?? null,
      steps: parsed.data.steps,
      personalizationAngle: parsed.data.personalizationAngle ?? null,
      confidence: parsed.data.confidence ?? null,
      status: parsed.data.status,
    });
    return NextResponse.json({ outbound, messages }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
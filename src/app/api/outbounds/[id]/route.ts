import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas/common";
import { getOutbound, listOutboundMessages } from "@/lib/services/outreach";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return errorResponse(parsedId.error);

  const supabase = await createClient();
  try {
    const outbound = await getOutbound(supabase, parsedId.data);
    if (!outbound) {
      return NextResponse.json({ error: "Outbound not found." }, { status: 404 });
    }
    const messages = await listOutboundMessages(supabase, outbound.id);
    return NextResponse.json({ outbound, messages });
  } catch (error) {
    return errorResponse(error);
  }
}
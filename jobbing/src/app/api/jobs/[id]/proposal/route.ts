import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas/common";
import { regenerateInstructionSchema } from "@/lib/schemas/proposal";
import { generateProposal } from "@/lib/services/proposals";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  instruction: regenerateInstructionSchema.optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return errorResponse(parsedId.error);

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    body = bodySchema.parse(raw);
  } catch (error) {
    return errorResponse(error);
  }

  const supabase = await createClient();
  try {
    const proposal = await generateProposal(
      supabase,
      parsedId.data,
      body.instruction,
    );
    return NextResponse.json(proposal);
  } catch (error) {
    return errorResponse(error);
  }
}
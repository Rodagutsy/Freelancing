import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas/common";
import { portfolioProjectInputSchema } from "@/lib/schemas/portfolio";
import {
  deletePortfolioProject,
  updatePortfolioProject,
} from "@/lib/services/portfolio";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return errorResponse(parsedId.error);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse(new Error("Invalid JSON body."));
  }

  const parsed = portfolioProjectInputSchema.safeParse(input);
  if (!parsed.success) return errorResponse(parsed.error);

  const supabase = await createClient();
  try {
    const project = await updatePortfolioProject(supabase, parsedId.data, parsed.data);
    return NextResponse.json(project);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return errorResponse(parsedId.error);

  const supabase = await createClient();
  try {
    await deletePortfolioProject(supabase, parsedId.data);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
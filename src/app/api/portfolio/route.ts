import { NextResponse } from "next/server";
import { errorResponse, requireApiUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { portfolioProjectInputSchema } from "@/lib/schemas/portfolio";
import {
  createPortfolioProject,
  listPortfolioProjects,
} from "@/lib/services/portfolio";

export async function GET() {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

  const supabase = await createClient();
  const projects = await listPortfolioProjects(supabase);
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const unauthorized = await requireApiUser();
  if (unauthorized) return unauthorized;

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
    const project = await createPortfolioProject(supabase, parsed.data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
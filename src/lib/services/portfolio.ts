import type {
  DatabaseClient,
  PortfolioProjectInput,
  PortfolioProjectRow,
} from "@/lib/types";

export async function listPortfolioProjects(
  client: DatabaseClient,
  userId?: string,
): Promise<PortfolioProjectRow[]> {
  let query = client
    .from("portfolio_projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as PortfolioProjectRow[];
}

export async function createPortfolioProject(
  client: DatabaseClient,
  input: PortfolioProjectInput,
): Promise<PortfolioProjectRow> {
  const { data, error } = await client
    .from("portfolio_projects")
    .insert({
      title: input.title,
      description: input.description ?? null,
      skills: input.skills,
      strength: input.strength,
      implementation_status: input.implementation_status,
      evidence_links: input.evidence_links,
      image_urls: input.image_urls,
      source_url: input.source_url ?? null,
      can_claim_text: input.can_claim_text,
      cannot_claim_text: input.cannot_claim_text ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as PortfolioProjectRow;
}

export async function updatePortfolioProject(
  client: DatabaseClient,
  projectId: string,
  input: PortfolioProjectInput,
): Promise<PortfolioProjectRow> {
  const { data, error } = await client
    .from("portfolio_projects")
    .update({
      title: input.title,
      description: input.description ?? null,
      skills: input.skills,
      strength: input.strength,
      implementation_status: input.implementation_status,
      evidence_links: input.evidence_links,
      image_urls: input.image_urls,
      source_url: input.source_url ?? null,
      can_claim_text: input.can_claim_text,
      cannot_claim_text: input.cannot_claim_text ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as PortfolioProjectRow;
}

export async function deletePortfolioProject(
  client: DatabaseClient,
  projectId: string,
): Promise<void> {
  const { error } = await client
    .from("portfolio_projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    throw new Error(error.message);
  }
}
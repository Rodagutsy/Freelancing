import { chatJson } from "@/lib/ai/deepseek";
import { buildProposalMessages } from "@/lib/ai/prompts";
import {
  proposalOutputSchema,
  type RegenerateInstruction,
} from "@/lib/schemas/proposal";
import type { DatabaseClient, ProposalRow } from "@/lib/types";
import { matchPortfolioProjects } from "@/lib/services/jobs";
import { listPortfolioProjects } from "@/lib/services/portfolio";
import { getProfile } from "@/lib/services/settings";
import type { JobRow } from "@/lib/types";

export async function getLatestProposal(
  client: DatabaseClient,
  jobId: string,
): Promise<ProposalRow | null> {
  const { data, error } = await client
    .from("proposals")
    .select("*")
    .eq("job_id", jobId)
    .order("version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as ProposalRow | null) ?? null;
}

/**
 * Generates (or regenerates) a tailored proposal for a job using DeepSeek.
 * AI output is validated against a Zod schema before being stored.
 */
export async function generateProposal(
  client: DatabaseClient,
  jobId: string,
  instruction?: RegenerateInstruction,
): Promise<ProposalRow> {
  const { data: jobData, error: jobError } = await client
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    throw new Error(jobError.message);
  }
  if (!jobData) {
    throw new Error("Job not found.");
  }

  const profile = await getProfile(client);
  if (!profile) {
    throw new Error(
      "Your profile is required to draft a proposal. Add it in Settings first.",
    );
  }

  const projects = await listPortfolioProjects(client);
  const matched = matchPortfolioProjects(projects, jobData.skills_requested);

  const { system, user } = buildProposalMessages({
    job: jobData as JobRow,
    profile,
    projects: matched,
    instruction,
  });

  const raw = await chatJson<unknown>(system, user, {
    temperature: 0.6,
    maxTokens: 1500,
  });
  const output = proposalOutputSchema.parse(raw);

  const latest = await getLatestProposal(client, jobId);
  const version = latest ? latest.version + 1 : 1;

  const { data, error } = await client
    .from("proposals")
    .insert({
      job_id: jobId,
      draft_text: output.draft_text,
      angle: output.angle,
      used_projects: output.used_projects,
      version,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as ProposalRow;
}
import type {
  ApplicationCreate,
  ApplicationRow,
  ApplicationUpdate,
  DatabaseClient,
  JobRow,
} from "@/lib/types";

export interface ApplicationWithJob extends ApplicationRow {
  job: JobRow | null;
}

export async function listApplications(
  client: DatabaseClient,
): Promise<ApplicationWithJob[]> {
  const { data, error } = await client
    .from("applications")
    .select("*")
    .order("applied_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ApplicationRow[];
  if (rows.length === 0) return [];

  const jobIds = Array.from(new Set(rows.map((r) => r.job_id)));
  const { data: jobsData, error: jobsError } = await client
    .from("jobs")
    .select("*")
    .in("id", jobIds);

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const jobMap = new Map<string, JobRow>(
    ((jobsData ?? []) as JobRow[]).map((job) => [job.id, job]),
  );

  return rows.map((row) => ({
    ...row,
    job: jobMap.get(row.job_id) ?? null,
  }));
}

export async function getApplicationForJob(
  client: DatabaseClient,
  jobId: string,
): Promise<ApplicationRow | null> {
  const { data, error } = await client
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as ApplicationRow | null) ?? null;
}

export async function createApplication(
  client: DatabaseClient,
  input: ApplicationCreate,
): Promise<ApplicationRow> {
  const { data, error } = await client
    .from("applications")
    .insert({
      job_id: input.jobId,
      proposal_id: input.proposalId ?? null,
      score_at_apply: input.scoreAtApply,
      outcome: input.outcome ?? "unknown",
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as ApplicationRow;
}

export async function updateApplication(
  client: DatabaseClient,
  applicationId: string,
  patch: ApplicationUpdate,
): Promise<ApplicationRow> {
  const { data, error } = await client
    .from("applications")
    .update({
      outcome: patch.outcome,
      notes: patch.notes === undefined ? undefined : patch.notes,
    })
    .eq("id", applicationId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as ApplicationRow;
}
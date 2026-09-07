"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient, requireUser } from "@/lib/supabase/server";
import { applicationUpdateSchema } from "@/lib/schemas/application";
import { addJobInputSchema } from "@/lib/schemas/job";
import { portfolioProjectInputSchema } from "@/lib/schemas/portfolio";
import { personaCreateSchema, profileInputSchema } from "@/lib/schemas/profile";
import { regenerateInstructionSchema } from "@/lib/schemas/proposal";
import { auditCreateSchema, pitchGenerateSchema, prospectCreateSchema, prospectUpdateSchema } from "@/lib/schemas/audit";
import { watchedCompanyCreateSchema } from "@/lib/schemas/common";
import { uuidSchema } from "@/lib/schemas/common";
import { getApplicationForJob, createApplication, updateApplication } from "@/lib/services/applications";
import { importJobPreview, type JobImportPreview } from "@/lib/services/jobImport";
import { downloadAndStoreImage, importLinkPreview, type LinkPreview } from "@/lib/services/linkImport";
import { listJobs } from "@/lib/services/jobs";
import { getLatestProposal, generateProposal } from "@/lib/services/proposals";
import { createPortfolioProject, deletePortfolioProject, updatePortfolioProject } from "@/lib/services/portfolio";
import { scoreJob } from "@/lib/services/scoring";
import {
  createProfile,
  deleteProfile,
  getDefaultProfile,
  setDefaultProfile,
  upsertProfile,
} from "@/lib/services/settings";
import {
  addWatchedCompany,
  deleteWatchedCompany,
  toggleWatchedCompany,
} from "@/lib/services/watchedCompanies";
import {
  createAudit,
  deleteAudit,
  getAudit,
} from "@/lib/services/audits";
import {
  createProspect,
  deleteProspect,
  getProspect,
  linkAuditToProspect,
  unlinkAuditFromProspect,
  updateProspect,
} from "@/lib/services/prospects";
import { generatePitch } from "@/lib/services/pitchGenerator";
import { generateOutboundDraft, reviseOutboundDraft } from "@/lib/services/outreachDraft";
import {
  queueOutboundForSend,
  queueOutboundStep,
  markMessageSent,
} from "@/lib/services/outboundSend";
import { recordReply, markMessageOpened } from "@/lib/services/outboundTracking";
import {
  addSuppressedContact,
  createOutboundWithMessages,
  getOutbound,
  removeSuppressedContact,
  setOutboundSteps,
  updateOutboundStatus,
} from "@/lib/services/outreach";
import {
  outboundDraftInputSchema,
  outboundRejectSchema,
  outboundReplySchema,
  outboundReviseSchema,
  outboundStepsUpdateSchema,
  suppressedContactCreateSchema,
} from "@/lib/schemas/outreach";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof z.ZodError
      ? error.issues.map((i) => i.message).join(", ")
      : error instanceof Error
        ? error.message
        : "Something went wrong. Try again.";
  return { ok: false, error: message };
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<ActionResult> {
  try {
    const parsedEmail = z.string().trim().email().safeParse(email);
    if (!parsedEmail.success) {
      return { ok: false, error: "Enter a valid email address." };
    }
    const parsedPassword = z.string().min(1, "Password is required").safeParse(password);
    if (!parsedPassword.success) {
      return { ok: false, error: "Enter your password." };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: parsedEmail.data,
      password: parsedPassword.data,
    });

    if (error) {
      return { ok: false, error: "Invalid email or password." };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Sign-in failed. Check that the Supabase URL and anon key are configured.",
    };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<ActionResult> {
  try {
    const parsedEmail = z.string().trim().email().safeParse(email);
    if (!parsedEmail.success) {
      return { ok: false, error: "Enter a valid email address." };
    }
    const parsedPassword = z.string().min(6, "Password must be at least 6 characters").safeParse(password);
    if (!parsedPassword.success) {
      return { ok: false, error: parsedPassword.error.issues[0].message };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email: parsedEmail.data,
      password: parsedPassword.data,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Sign-up failed. Check that the Supabase URL and anon key are configured.",
    };
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/* ------------------------------------------------------------------ */
/* Jobs / decisions                                                    */
/* ------------------------------------------------------------------ */

export async function markJobApplied(
  jobId: string,
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(jobId);
  if (!parsed.success) return { ok: false, error: "Invalid job id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();

    const existing = await getApplicationForJob(supabase, parsed.data);
    if (existing) {
      return { ok: false, error: "This job is already logged as applied." };
    }

    const { data: feed } = await supabase
      .from("job_feed")
      .select("*")
      .eq("id", parsed.data)
      .maybeSingle();

    const proposal = await getLatestProposal(supabase, parsed.data);

    await createApplication(supabase, {
      jobId: parsed.data,
      proposalId: proposal?.id ?? null,
      scoreAtApply: feed?.score_total ?? 0,
      outcome: "unknown",
    });

    await supabase
      .from("jobs")
      .update({ skipped_at: null, skip_reason: null })
      .eq("id", parsed.data);

    revalidatePath("/jobs/[id]", "page");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const SKIP_REASONS = [
  "Not a fit",
  "Budget too low",
  "Client issues",
  "Too much competition",
  "Other",
] as const;

export async function markJobSkipped(
  jobId: string,
  reason: string,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(jobId);
  if (!parsedId.success) return { ok: false, error: "Invalid job id." };

  const parsedReason = z
    .enum(SKIP_REASONS)
    .safeParse(reason);
  if (!parsedReason.success) {
    return { ok: false, error: "Choose a valid skip reason." };
  }

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("jobs")
      .update({
        skipped_at: new Date().toISOString(),
        skip_reason: parsedReason.data,
      })
      .eq("id", parsedId.data);

    if (error) throw new Error(error.message);

    revalidatePath("/jobs/[id]", "page");
    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateApplicationForJob(
  jobId: string,
  patch: z.infer<typeof applicationUpdateSchema>,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(jobId);
  const parsedPatch = applicationUpdateSchema.safeParse(patch);
  if (!parsedId.success) return { ok: false, error: "Invalid job id." };
  if (!parsedPatch.success) return fail(parsedPatch.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const existing = await getApplicationForJob(supabase, parsedId.data);
    if (!existing) {
      return { ok: false, error: "No application logged for this job yet." };
    }

    await updateApplication(supabase, existing.id, parsedPatch.data);

    revalidatePath("/jobs/[id]", "page");
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Manual job intake (add by URL / paste)                              */
/* ------------------------------------------------------------------ */

export async function fetchJobFromUrl(
  url: string,
): Promise<ActionResult<JobImportPreview>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const parsed = z.string().trim().url().safeParse(url);
  if (!parsed.success) return { ok: false, error: "Enter a valid URL." };

  try {
    const preview = await importJobPreview(parsed.data);
    return { ok: true, data: preview };
  } catch (error) {
    return fail(error);
  }
}

export async function addJob(
  input: z.infer<typeof addJobInputSchema>,
): Promise<
  ActionResult<{ jobId: string; scoreTotal: number; recommendation: string }>
> {
  const parsed = addJobInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const url = parsed.data.url;

    const { data: existing } = await supabase
      .from("jobs")
      .select("id")
      .eq("url", url)
      .maybeSingle();
    if (existing) {
      return { ok: false, error: "That job is already in your queue." };
    }

    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        source: "upwork_api",
        raw_payload: {
          imported_manually: true,
          submitted_at: new Date().toISOString(),
        },
        title: parsed.data.title,
        description: parsed.data.description,
        skills_requested: parsed.data.skills,
        budget_min: parsed.data.budget_min ?? null,
        budget_max: parsed.data.budget_max ?? null,
        budget_type: parsed.data.budget_type ?? null,
        url,
        posted_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const score = await scoreJob(supabase, job.id);

    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: {
        jobId: job.id,
        scoreTotal: score.score_total,
        recommendation: score.recommendation,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Proposals                                                           */
/* ------------------------------------------------------------------ */

export async function generateProposalAction(
  jobId: string,
  instruction?: string,
  profileId?: string,
): Promise<
  ActionResult<{
    proposalId: string;
    version: number;
    draftText: string;
    angle: string;
    usedProjects: string[];
  }>
> {
  const parsedId = uuidSchema.safeParse(jobId);
  if (!parsedId.success) return { ok: false, error: "Invalid job id." };

  const parsedInstruction =
    instruction === undefined || instruction === ""
      ? undefined
      : regenerateInstructionSchema.safeParse(instruction);
  if (instruction !== undefined && instruction !== "" && !parsedInstruction!.success) {
    return { ok: false, error: "Choose a valid regeneration instruction." };
  }

  let personaId: string | undefined = profileId;
  if (personaId !== undefined && personaId !== "") {
    const parsedPersona = uuidSchema.safeParse(personaId);
    if (!parsedPersona.success) {
      return { ok: false, error: "Invalid persona id." };
    }
    personaId = parsedPersona.data;
  } else {
    personaId = undefined;
  }

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const proposal = await generateProposal(
      supabase,
      parsedId.data,
      parsedInstruction?.data,
      personaId,
    );

    revalidatePath("/jobs/[id]", "page");
    return {
      ok: true,
      data: {
        proposalId: proposal.id,
        version: proposal.version,
        draftText: proposal.draft_text,
        angle: proposal.angle,
        usedProjects: proposal.used_projects,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

/** Re-scores a job with the given persona (default persona when omitted). */
export async function rescoreJobAction(
  jobId: string,
  profileId?: string,
): Promise<
  ActionResult<{ scoreTotal: number; recommendation: string; personaLabel?: string }>
> {
  const parsedId = uuidSchema.safeParse(jobId);
  if (!parsedId.success) return { ok: false, error: "Invalid job id." };

  let personaId: string | undefined = profileId;
  if (personaId !== undefined && personaId !== "") {
    const parsedPersona = uuidSchema.safeParse(personaId);
    if (!parsedPersona.success) return { ok: false, error: "Invalid persona id." };
    personaId = parsedPersona.data;
  } else {
    personaId = undefined;
  }

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const score = await scoreJob(supabase, parsedId.data, personaId);
    revalidatePath("/jobs/[id]", "page");
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: {
        scoreTotal: Number(score.score_total),
        recommendation: score.recommendation,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Settings (personas)                                                 */
/* ------------------------------------------------------------------ */

export async function saveProfile(
  input: z.infer<typeof profileInputSchema>,
  profileId?: string,
): Promise<ActionResult> {
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  let targetId: string | undefined = profileId;
  if (targetId !== undefined) {
    const parsedId = uuidSchema.safeParse(targetId);
    if (!parsedId.success) return { ok: false, error: "Invalid persona id." };
    targetId = parsedId.data;
  }

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    if (!targetId) {
      // Legacy single-form callers update the default persona.
      const fallback = await getDefaultProfile(supabase);
      if (!fallback) {
        return {
          ok: false,
          error: "No persona found yet — create one first.",
        };
      }
      targetId = fallback.id;
    }
    await upsertProfile(supabase, parsed.data, targetId);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createPersonaAction(
  input: z.infer<typeof personaCreateSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = personaCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const persona = await createProfile(supabase, parsed.data);
    revalidatePath("/settings");
    return { ok: true, data: { id: persona.id } };
  } catch (error) {
    return fail(error);
  }
}

export async function setDefaultPersonaAction(
  personaId: string,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(personaId);
  if (!parsedId.success) return { ok: false, error: "Invalid persona id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await setDefaultProfile(supabase, parsedId.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePersonaAction(
  personaId: string,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(personaId);
  if (!parsedId.success) return { ok: false, error: "Invalid persona id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await deleteProfile(supabase, parsedId.data);
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Portfolio                                                           */
/* ------------------------------------------------------------------ */

export async function savePortfolioProject(
  input: z.infer<typeof portfolioProjectInputSchema>,
  projectId?: string,
): Promise<ActionResult> {
  const parsed = portfolioProjectInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  if (projectId) {
    const parsedId = uuidSchema.safeParse(projectId);
    if (!parsedId.success) return { ok: false, error: "Invalid project id." };
  }

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    if (projectId) {
      await updatePortfolioProject(supabase, projectId, parsed.data);
    } else {
      await createPortfolioProject(supabase, parsed.data);
    }
    revalidatePath("/portfolio");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePortfolioProjectAction(
  projectId: string,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(projectId);
  if (!parsedId.success) return { ok: false, error: "Invalid project id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await deletePortfolioProject(supabase, parsedId.data);
    revalidatePath("/portfolio");
    revalidatePath("/jobs/[id]", "page");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function fetchPortfolioFromUrl(
  url: string,
): Promise<ActionResult<LinkPreview & { storedImageUrl?: string }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const parsed = z.string().trim().url().safeParse(url);
  if (!parsed.success) return { ok: false, error: "Enter a valid URL." };

  try {
    const supabase = await createClient();
    const preview = await importLinkPreview(parsed.data);

    let storedImageUrl: string | undefined;
    if (preview.kind === "project" && preview.imageUrl) {
      try {
        storedImageUrl = await downloadAndStoreImage(
          supabase,
          user.id,
          preview.imageUrl,
        );
      } catch {
        // Best-effort only — the remote URL stays on the preview as fallback.
        storedImageUrl = undefined;
      }
    }

    return { ok: true, data: { ...preview, storedImageUrl } };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Watched companies (ATS radar)                                       */
/* ------------------------------------------------------------------ */

export async function addWatchedCompanyAction(input: {
  name: string;
  url: string;
  region?: "us" | "eu";
}): Promise<ActionResult> {
  const parsed = watchedCompanyCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await addWatchedCompany(supabase, {
      name: parsed.data.name,
      careersUrl: parsed.data.url,
      region: parsed.data.region,
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function toggleWatchedCompanyAction(
  companyId: string,
  active: boolean,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(companyId);
  if (!parsedId.success) return { ok: false, error: "Invalid company id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await toggleWatchedCompany(supabase, parsedId.data, active);
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteWatchedCompanyAction(
  companyId: string,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(companyId);
  if (!parsedId.success) return { ok: false, error: "Invalid company id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await deleteWatchedCompany(supabase, parsedId.data);
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Shared helpers for client components                                */
/* ------------------------------------------------------------------ */

/** Server-side fetch used by the FilterBar's paginated job list. */
export async function fetchJobList(
  params: Record<string, string>,
): Promise<ActionResult<{ items: unknown[]; total: number; page: number; pageCount: number }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const result = await listJobs(supabase, {
      scoreMin: params.scoreMin ? Number(params.scoreMin) : undefined,
      scoreMax: params.scoreMax ? Number(params.scoreMax) : undefined,
      postedHours: params.postedHours ? Number(params.postedHours) : undefined,
      budgetMin: params.budgetMin ? Number(params.budgetMin) : undefined,
      clientRating: params.clientRating ? Number(params.clientRating) : undefined,
      skills: params.skills ? JSON.parse(params.skills) : undefined,
      status: params.status as never,
      page: params.page ? Number(params.page) : 1,
      sort: params.sort as never,
    });
    return { ok: true, data: result };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Audits                                                              */
/* ------------------------------------------------------------------ */

export async function startAuditAction(
  input: z.infer<typeof auditCreateSchema>,
): Promise<ActionResult<{ auditId: string }>> {
  const parsed = auditCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const audit = await createAudit(supabase, parsed.data);

    const webhookUrl = process.env.N8N_AUDIT_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
        },
        body: JSON.stringify({ audit_id: audit.id, url: parsed.data.url }),
      }).catch(() => {});
    }

    revalidatePath("/audits");
    revalidatePath("/dashboard");
    return { ok: true, data: { auditId: audit.id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAuditAction(
  auditId: string,
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(auditId);
  if (!parsed.success) return { ok: false, error: "Invalid audit id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await deleteAudit(supabase, parsed.data);
    revalidatePath("/audits");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function generatePitchAction(
  auditId: string,
  opportunityIds: string[],
): Promise<
  ActionResult<{ pitchText: string; subjectLine: string; keyPoints: string[] }>
> {
  const parsedAudit = uuidSchema.safeParse(auditId);
  if (!parsedAudit.success) return { ok: false, error: "Invalid audit id." };

  const parsedPitch = pitchGenerateSchema.safeParse({
    audit_id: auditId,
    opportunity_ids: opportunityIds,
  });
  if (!parsedPitch.success) return fail(parsedPitch.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const result = await generatePitch(supabase, parsedAudit.data, opportunityIds);
    return {
      ok: true,
      data: {
        pitchText: result.pitch_text,
        subjectLine: result.subject_line,
        keyPoints: result.key_points,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Prospects                                                           */
/* ------------------------------------------------------------------ */

export async function createProspectAction(
  input: z.infer<typeof prospectCreateSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = prospectCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const prospect = await createProspect(supabase, parsed.data);
    revalidatePath("/prospects");
    return { ok: true, data: { id: prospect.id } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateProspectAction(
  prospectId: string,
  input: z.infer<typeof prospectUpdateSchema>,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(prospectId);
  if (!parsedId.success) return { ok: false, error: "Invalid prospect id." };

  const parsed = prospectUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await updateProspect(supabase, parsedId.data, parsed.data);
    revalidatePath("/prospects");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteProspectAction(
  prospectId: string,
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(prospectId);
  if (!parsed.success) return { ok: false, error: "Invalid prospect id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await deleteProspect(supabase, parsed.data);
    revalidatePath("/prospects");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function linkAuditToProspectAction(
  prospectId: string,
  auditId: string,
  isPrimary = false,
): Promise<ActionResult> {
  const parsedProspect = uuidSchema.safeParse(prospectId);
  if (!parsedProspect.success) return { ok: false, error: "Invalid prospect id." };
  const parsedAudit = uuidSchema.safeParse(auditId);
  if (!parsedAudit.success) return { ok: false, error: "Invalid audit id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await linkAuditToProspect(supabase, parsedProspect.data, parsedAudit.data, isPrimary);
    revalidatePath("/prospects");
    revalidatePath("/audits");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function unlinkAuditFromProspectAction(
  prospectId: string,
  auditId: string,
): Promise<ActionResult> {
  const parsedProspect = uuidSchema.safeParse(prospectId);
  if (!parsedProspect.success) return { ok: false, error: "Invalid prospect id." };
  const parsedAudit = uuidSchema.safeParse(auditId);
  if (!parsedAudit.success) return { ok: false, error: "Invalid audit id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await unlinkAuditFromProspect(supabase, parsedProspect.data, parsedAudit.data);
    revalidatePath("/prospects");
    revalidatePath("/audits");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Outreach (drafting + approval loop)                                 */
/* ------------------------------------------------------------------ */

const REVISION_ALLOWED: ReadonlySet<string> = new Set(["pitch_drafted", "rejected"]);

export async function draftOutboundAction(
  input: z.infer<typeof outboundDraftInputSchema>,
): Promise<
  ActionResult<{ outboundId: string; source: "ai" | "template"; status: string }>
> {
  const parsed = outboundDraftInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const draft = await generateOutboundDraft(supabase, parsed.data);
    const { outbound } = await createOutboundWithMessages(supabase, {
      prospectId: parsed.data.prospectId,
      emailSequenceId: parsed.data.emailSequenceId ?? null,
      steps: draft.steps,
      personalizationAngle: draft.personalizationAngle,
      status: "pitch_drafted",
    });
    revalidatePath("/outbounds");
    revalidatePath(`/outbounds/${outbound.id}`);
    revalidatePath(`/prospects/${parsed.data.prospectId}`);
    return {
      ok: true,
      data: {
        outboundId: outbound.id,
        source: draft.source,
        status: outbound.status,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function approveOutboundAction(
  outboundId: string,
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(outboundId);
  if (!parsed.success) return { ok: false, error: "Invalid outbound id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const outbound = await getOutbound(supabase, parsed.data);
    if (!outbound) return { ok: false, error: "Outbound not found." };
    if (!["pitch_drafted", "need_approval"].includes(outbound.status)) {
      return { ok: false, error: "Only a draft can be approved." };
    }
    if (!outbound.steps || outbound.steps.length === 0) {
      return { ok: false, error: "Add at least one email step before approving." };
    }
    await updateOutboundStatus(supabase, outbound.id, { status: "approved" });
    revalidatePath("/outbounds");
    revalidatePath(`/outbounds/${outbound.id}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function rejectOutboundAction(
  outboundId: string,
  input: z.infer<typeof outboundRejectSchema>,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(outboundId);
  if (!parsedId.success) return { ok: false, error: "Invalid outbound id." };
  const parsed = outboundRejectSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const outbound = await getOutbound(supabase, parsedId.data);
    if (!outbound) return { ok: false, error: "Outbound not found." };
    if (!["pitch_drafted", "need_approval", "approved"].includes(outbound.status)) {
      return { ok: false, error: "This outbound can no longer be rejected." };
    }
    await updateOutboundStatus(supabase, outbound.id, {
      status: "rejected",
      approvalNote: parsed.data.note ?? null,
    });
    revalidatePath("/outbounds");
    revalidatePath(`/outbounds/${outbound.id}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function reviseOutboundAction(
  outboundId: string,
  input: z.infer<typeof outboundReviseSchema>,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(outboundId);
  if (!parsedId.success) return { ok: false, error: "Invalid outbound id." };
  const parsed = outboundReviseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const outbound = await getOutbound(supabase, parsedId.data);
    if (!outbound) return { ok: false, error: "Outbound not found." };
    if (!REVISION_ALLOWED.has(outbound.status)) {
      return { ok: false, error: "Only rejected or unapproved drafts can be revised." };
    }
    const revised = await reviseOutboundDraft(supabase, outbound, parsed.data.instruction);
    await setOutboundSteps(
      supabase,
      outbound.id,
      revised.steps,
      revised.personalizationAngle,
    );
    await updateOutboundStatus(supabase, outbound.id, { status: "pitch_drafted" });
    revalidatePath("/outbounds");
    revalidatePath(`/outbounds/${outbound.id}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveOutboundStepsAction(
  outboundId: string,
  input: z.infer<typeof outboundStepsUpdateSchema>,
): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(outboundId);
  if (!parsedId.success) return { ok: false, error: "Invalid outbound id." };
  const parsed = outboundStepsUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const outbound = await getOutbound(supabase, parsedId.data);
    if (!outbound) return { ok: false, error: "Outbound not found." };
    if (!REVISION_ALLOWED.has(outbound.status)) {
      return { ok: false, error: "Steps can only be edited while the outbound is a draft." };
    }
    await setOutboundSteps(
      supabase,
      outbound.id,
      parsed.data.steps,
      parsed.data.personalizationAngle ?? null,
    );
    revalidatePath("/outbounds");
    revalidatePath(`/outbounds/${outbound.id}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function sendOutboundAction(
  outboundId: string,
): Promise<ActionResult<{ messageId: string; stepNo: number }>> {
  const parsed = uuidSchema.safeParse(outboundId);
  if (!parsed.success) return { ok: false, error: "Invalid outbound id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const { outbound, message } = await queueOutboundForSend(supabase, parsed.data);

    const prospect = await getProspect(supabase, outbound.prospect_id);
    const webhookUrl =
      process.env.N8N_OUTBOUND_WEBHOOK_URL ?? process.env.N8N_AUDIT_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    if (webhookUrl && prospect) {
      fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
        },
        body: JSON.stringify({
          outbound_id: outbound.id,
          message_id: message.id,
          step_no: message.step_no,
          subject: message.subject,
          body: message.body,
          to: prospect.contact_email,
          contact_name: prospect.contact_name,
          company_name: prospect.company_name,
        }),
      }).catch(() => {});
    }

    revalidatePath("/outbounds");
    revalidatePath(`/outbounds/${outbound.id}`);
    return { ok: true, data: { messageId: message.id, stepNo: message.step_no } };
  } catch (error) {
    return fail(error);
  }
}

export async function sendNextFollowUpAction(
  outboundId: string,
): Promise<ActionResult<{ messageId: string; stepNo: number }>> {
  const parsed = uuidSchema.safeParse(outboundId);
  if (!parsed.success) return { ok: false, error: "Invalid outbound id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const { outbound, message } = await queueOutboundStep(supabase, parsed.data, {
      followUp: true,
    });

    const prospect = await getProspect(supabase, outbound.prospect_id);
    const webhookUrl =
      process.env.N8N_OUTBOUND_WEBHOOK_URL ?? process.env.N8N_AUDIT_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    if (webhookUrl && prospect) {
      fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
        },
        body: JSON.stringify({
          outbound_id: outbound.id,
          message_id: message.id,
          step_no: message.step_no,
          subject: message.subject,
          body: message.body,
          to: prospect.contact_email,
          contact_name: prospect.contact_name,
          company_name: prospect.company_name,
          follow_up: true,
        }),
      }).catch(() => {});
    }

    revalidatePath("/outbounds");
    revalidatePath(`/outbounds/${outbound.id}`);
    return { ok: true, data: { messageId: message.id, stepNo: message.step_no } };
  } catch (error) {
    return fail(error);
  }
}

export async function confirmOutboundMessageSentAction(
  messageId: string,
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(messageId);
  if (!parsed.success) return { ok: false, error: "Invalid message id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const { outbound } = await markMessageSent(supabase, parsed.data, {
      provider: "manual",
    });
    revalidatePath("/outbounds");
    revalidatePath(`/outbounds/${outbound.id}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function markMessageOpenedAction(
  messageId: string,
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(messageId);
  if (!parsed.success) return { ok: false, error: "Invalid message id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const message = await markMessageOpened(supabase, parsed.data);
    revalidatePath(`/outbounds/${message.outbound_id}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function recordReplyAction(
  input: z.infer<typeof outboundReplySchema>,
): Promise<ActionResult> {
  const parsed = outboundReplySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    const { outbound } = await recordReply(supabase, parsed.data);
    revalidatePath("/outbounds");
    revalidatePath(`/outbounds/${outbound.id}`);
    revalidatePath(`/prospects/${outbound.prospect_id}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function addSuppressedContactAction(
  input: z.infer<typeof suppressedContactCreateSchema>,
): Promise<ActionResult> {
  const parsed = suppressedContactCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await addSuppressedContact(supabase, parsed.data);
    revalidatePath("/outbounds");
    revalidatePath("/outbounds/suppressed");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function removeSuppressedContactAction(
  suppressedId: string,
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(suppressedId);
  if (!parsed.success) return { ok: false, error: "Invalid suppression id." };

  const user = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const supabase = await createClient();
    await removeSuppressedContact(supabase, parsed.data);
    revalidatePath("/outbounds");
    revalidatePath("/outbounds/suppressed");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
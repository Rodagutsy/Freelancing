import type { DatabaseClient, ProfileRow } from "@/lib/types";

/**
 * Stores the raw text of an uploaded master CV on a persona. The text is later
 * used to generate per-job tailored CVs and to auto-fill persona fields.
 */
export async function savePersonaCv(
  client: DatabaseClient,
  profileId: string,
  input: { text: string; filename: string },
): Promise<ProfileRow> {
  const { data, error } = await client
    .from("profiles")
    .update({
      master_cv_text: input.text,
      master_cv_filename: input.filename,
      master_cv_uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function clearPersonaCv(
  client: DatabaseClient,
  profileId: string,
): Promise<ProfileRow> {
  const { data, error } = await client
    .from("profiles")
    .update({
      master_cv_text: null,
      master_cv_filename: null,
      master_cv_uploaded_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

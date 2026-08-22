import type { DatabaseClient, PersonaCreateInput, ProfileInput, ProfileRow } from "@/lib/types";

function payloadFromInput(input: ProfileInput) {
  return {
    name: input.name,
    headline: input.headline,
    bio: input.bio ?? null,
    services: input.services,
    niches: input.niches,
    target_rate_min: input.target_rate_min ?? null,
    target_rate_max: input.target_rate_max ?? null,
    behance_url: input.behance_url ?? null,
    pinterest_url: input.pinterest_url ?? null,
    linkedin_url: input.linkedin_url ?? null,
    upwork_profile_url: input.upwork_profile_url ?? null,
    website_url: input.website_url ?? null,
    label: input.label.trim() || input.name.trim(),
    updated_at: new Date().toISOString(),
  };
}

export async function getProfiles(client: DatabaseClient): Promise<ProfileRow[]> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as ProfileRow[];
}

export async function getDefaultProfile(
  client: DatabaseClient,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (data) {
    return data as ProfileRow;
  }

  // Fallback when no default is flagged yet (pre-patch databases).
  const all = await getProfiles(client);
  return all[0] ?? null;
}

export async function getProfileById(
  client: DatabaseClient,
  id: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as ProfileRow | null) ?? null;
}

/** Resolves the persona to score/draft with: explicit id, else the default. */
export async function resolveProfile(
  client: DatabaseClient,
  profileId?: string,
): Promise<ProfileRow> {
  if (profileId) {
    const profile = await getProfileById(client, profileId);
    if (!profile) {
      throw new Error("That persona no longer exists. Refresh and pick another.");
    }
    return profile;
  }

  const fallback = await getDefaultProfile(client);
  if (!fallback) {
    throw new Error(
      "Your profile is required first. Add it in Settings.",
    );
  }
  return fallback;
}

export async function createProfile(
  client: DatabaseClient,
  input: PersonaCreateInput,
): Promise<ProfileRow> {
  const existing = await getProfiles(client);
  const maxSort = existing.reduce((max, p) => Math.max(max, p.sort_order), 0);

  const { data, error } = await client
    .from("profiles")
    .insert({
      name: input.label,
      label: input.label,
      headline: "",
      pillar: input.pillar,
      is_default: existing.length === 0,
      sort_order: maxSort + 10,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as ProfileRow;
}

/**
 * Updates an existing persona ("upsert-with-id"). The id must exist —
 * new personas go through createProfile.
 */
export async function upsertProfile(
  client: DatabaseClient,
  input: ProfileInput,
  profileId: string,
): Promise<ProfileRow> {
  const { data, error } = await client
    .from("profiles")
    .update(payloadFromInput(input))
    .eq("id", profileId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as ProfileRow;
}

export async function setDefaultProfile(
  client: DatabaseClient,
  profileId: string,
): Promise<void> {
  // Clear other flags first so the single-default unique index holds throughout.
  const { error: clearError } = await client
    .from("profiles")
    .update({ is_default: false })
    .neq("id", profileId);
  if (clearError) {
    throw new Error(clearError.message);
  }

  const { error: setError } = await client
    .from("profiles")
    .update({ is_default: true })
    .eq("id", profileId);
  if (setError) {
    throw new Error(setError.message);
  }
}

export async function deleteProfile(
  client: DatabaseClient,
  profileId: string,
): Promise<void> {
  const profiles = await getProfiles(client);
  const target = profiles.find((p) => p.id === profileId);
  if (!target) {
    return;
  }
  if (target.is_default && profiles.length > 1) {
    throw new Error(
      "Set another persona as default before deleting this one.",
    );
  }

  const { error } = await client
    .from("profiles")
    .delete()
    .eq("id", profileId);
  if (error) {
    throw new Error(error.message);
  }
}

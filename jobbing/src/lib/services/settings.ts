import type { DatabaseClient, ProfileInput, ProfileRow } from "@/lib/types";

export async function getProfile(
  client: DatabaseClient,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as ProfileRow | null) ?? null;
}

export async function upsertProfile(
  client: DatabaseClient,
  input: ProfileInput,
): Promise<ProfileRow> {
  const existing = await getProfile(client);

  const payload = {
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
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await client
      .from("profiles")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as ProfileRow;
  }

  const { data, error } = await client
    .from("profiles")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as ProfileRow;
}
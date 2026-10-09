import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number | null;
}

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

/**
 * Fixed-window rate limiter backed by the `rate_limits` table (see
 * supabase/18_rate_limits.sql). Runs only on the server via the service-role
 * client, so it works for unauthenticated flows (sign-in / sign-up) too.
 *
 * Buckets are unique strings the caller composes, e.g. `auth:signin:<email>`
 * or `ai:proposal:<userId>`. The window is fixed: a new window starts when a
 * counter ages out past the caller's window, not per request.
 */
export async function checkRateLimit(
  bucketKey: string,
  { limit, windowMs }: RateLimitRule,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("rate_limits")
    .select("bucket_key, hits, window_start")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (!row) {
    const { error } = await admin.from("rate_limits").insert({
      bucket_key: bucketKey,
      hits: 1,
      window_start: now.toISOString(),
      updated_at: now.toISOString(),
    });
    if (error) {
      return { ok: true, remaining: limit - 1, retryAfterMs: null };
    }
    return { ok: true, remaining: limit - 1, retryAfterMs: null };
  }

  const windowStart = new Date(row.window_start).getTime();
  const windowExpired = now.getTime() - windowStart > windowMs;

  if (windowExpired) {
    const { error } = await admin
      .from("rate_limits")
      .update({
        hits: 1,
        window_start: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("bucket_key", bucketKey);
    if (error) {
      return { ok: true, remaining: limit - 1, retryAfterMs: null };
    }
    return { ok: true, remaining: limit - 1, retryAfterMs: null };
  }

  if (row.hits >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, windowStart + windowMs - now.getTime()),
    };
  }

  const { error } = await admin
    .from("rate_limits")
    .update({
      hits: row.hits + 1,
      updated_at: now.toISOString(),
    })
    .eq("bucket_key", bucketKey);
  if (error) {
    return { ok: true, remaining: limit - row.hits - 1, retryAfterMs: null };
  }
  return { ok: true, remaining: limit - row.hits - 1, retryAfterMs: null };
}

export const authRateRules = {
  signIn: { limit: 5, windowMs: 15 * 60 * 1000 },
  signUp: { limit: 3, windowMs: 60 * 60 * 1000 },
} as const;

export const aiRateRules = {
  proposal: { limit: 10, windowMs: 60 * 60 * 1000 },
  rescore: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Scoring a job against every persona in one shot. */
  scoreAll: { limit: 15, windowMs: 60 * 60 * 1000 },
  draft: { limit: 10, windowMs: 60 * 60 * 1000 },
  revise: { limit: 10, windowMs: 60 * 60 * 1000 },
  pitch: { limit: 10, windowMs: 60 * 60 * 1000 },
  qa: { limit: 10, windowMs: 60 * 60 * 1000 },
  coverLetter: { limit: 10, windowMs: 60 * 60 * 1000 },
  tailoredCv: { limit: 10, windowMs: 60 * 60 * 1000 },
  resume: { limit: 3, windowMs: 60 * 60 * 1000 },
  /** Manual "run intake now" scrapes. */
  atsRun: { limit: 12, windowMs: 60 * 60 * 1000 },
} as const;
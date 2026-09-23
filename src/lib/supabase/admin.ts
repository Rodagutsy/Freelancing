import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS. NEVER import this into client
 * components or API responses — server-only, and avoid unless strictly
 * required (e.g. trusted automation, migrations).
 */
export function createAdminClient() {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
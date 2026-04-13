import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv, requireSupabaseServiceRole } from "@/app/lib/env";

// The service-role client is intentionally untyped until generated database types are added.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serviceRoleClient: any = null;

export function createSupabaseServiceRoleClient() {
  if (!serviceRoleClient) {
    const { url } = requireSupabaseEnv();
    const serviceRoleKey = requireSupabaseServiceRole();

    serviceRoleClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serviceRoleClient;
}

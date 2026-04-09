import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/app/lib/env";

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const { url, publishableKey } = requireSupabaseEnv();
  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}

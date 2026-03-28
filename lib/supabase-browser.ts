import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Браузерный клиент: сессия в cookies (как в middleware / server).
 * Один экземпляр на вкладку — иначе каждый вызов плодит клиент и слушатели auth (лаги в CRM).
 */
export function supabaseBrowser(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (typeof window !== "undefined") {
    if (!browserClient) browserClient = createBrowserClient(url, key);
    return browserClient;
  }
  return createBrowserClient(url, key);
}

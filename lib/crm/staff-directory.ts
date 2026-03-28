import type { SupabaseClient } from "@supabase/supabase-js";

export type CrmStaffOption = { user_id: string; email: string | null };

/** Spisok sotrudnikov CRM dlja naznachenija (posle migracii s policy crm_staff_select_team). */
export async function fetchCrmStaffOptions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("crm_staff")
    .select("user_id, email")
    .order("email", { ascending: true });
  if (error) return { options: [] as CrmStaffOption[], error: error.message };
  return { options: (data ?? []) as CrmStaffOption[], error: null };
}

export function staffEmailById(options: CrmStaffOption[]) {
  const m = new Map<string, string>();
  for (const o of options) {
    m.set(o.user_id, o.email?.trim() || o.user_id.slice(0, 8) + "…");
  }
  return m;
}

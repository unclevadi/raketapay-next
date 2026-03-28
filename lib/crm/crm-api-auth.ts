import { supabaseServer } from "@/lib/supabase/server";

export async function requireCrmB2bSession(): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof supabaseServer>> }
  | { ok: false; status: number; message: string }
> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, message: "Не авторизован" };
  const { data: row } = await supabase
    .from("crm_staff")
    .select("can_access_b2b, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row || (!row.can_access_b2b && !row.is_admin)) {
    return { ok: false, status: 403, message: "Нет доступа к B2B" };
  }
  return { ok: true, userId: user.id, supabase };
}

export async function requireCrmStaffSession(): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof supabaseServer>> }
  | { ok: false; status: number; message: string }
> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, message: "Не авторизован" };
  const { data: row } = await supabase
    .from("crm_staff")
    .select("can_access_retail, can_access_b2b, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row || (!row.can_access_retail && !row.can_access_b2b && !row.is_admin)) {
    return { ok: false, status: 403, message: "Нет доступа к CRM" };
  }
  return { ok: true, userId: user.id, supabase };
}

import type { SupabaseClient } from "@supabase/supabase-js";

/** Best-effort: ne blokiruem UI pri oshibke zapisi v audit. */
export async function logCrmAudit(
  supabase: SupabaseClient,
  params: {
    event_type: string;
    entity_table: string;
    entity_id: string;
    summary: string;
    meta?: Record<string, unknown>;
  }
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("crm_audit_log").insert({
      user_id: user?.id ?? null,
      event_type: params.event_type,
      entity_table: params.entity_table,
      entity_id: params.entity_id,
      summary: params.summary,
      meta: params.meta ?? null,
    });
  } catch {
    /* ignore */
  }
}

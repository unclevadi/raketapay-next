/**
 * Supabase Database Webhooks → POST сюда.
 * В Dashboard: Database → Webhooks → добавить заголовок
 *   x-crm-webhook-secret: <значение CRM_WEBHOOK_SECRET>
 * События: crm_leads INSERT; crm_b2b_deals UPDATE (при смене stage_id).
 * Дублирует уведомления вместе с вызовами из UI (/api/crm/notify/*).
 */
import { NextResponse } from "next/server";
import { notifyB2bStageChangeCrm, notifyNewLeadCrm } from "@/lib/crm/crm-notify";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type WebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  const secret = process.env.CRM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRM_WEBHOOK_SECRET не задан" }, { status: 503 });
  }
  const hdr = request.headers.get("x-crm-webhook-secret")?.trim();
  if (hdr !== secret) {
    return NextResponse.json({ error: "secret" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }

  const table = payload.table;
  const type = payload.type;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return NextResponse.json({ error: "service role" }, { status: 500 });
  }

  try {
    if (table === "crm_leads" && type === "INSERT" && payload.record) {
      const r = payload.record;
      await notifyNewLeadCrm({
        id: String(r.id),
        contact_name: String(r.contact_name ?? ""),
        company_name: (r.company_name as string | null) ?? null,
        assigned_to: (r.assigned_to as string | null) ?? null,
      });
      return NextResponse.json({ ok: true, handled: "lead_insert" });
    }

    if (table === "crm_b2b_deals" && type === "UPDATE" && payload.record && payload.old_record) {
      const newSid = payload.record.stage_id as string | undefined;
      const oldSid = payload.old_record.stage_id as string | undefined;
      if (newSid && oldSid && newSid !== oldSid) {
        const dealId = String(payload.record.id);
        const [{ data: sOld }, { data: sNew }, { data: deal }] = await Promise.all([
          admin.from("crm_b2b_pipeline_stages").select("slug").eq("id", oldSid).maybeSingle(),
          admin.from("crm_b2b_pipeline_stages").select("slug").eq("id", newSid).maybeSingle(),
          admin.from("crm_b2b_deals").select("company_legal_name, assigned_to").eq("id", dealId).maybeSingle(),
        ]);
        if (deal) {
          await notifyB2bStageChangeCrm({
            dealId,
            company: deal.company_legal_name,
            fromSlug: sOld?.slug ?? null,
            toSlug: sNew?.slug ?? null,
            assignedTo: deal.assigned_to,
          });
        }
        return NextResponse.json({ ok: true, handled: "b2b_stage" });
      }
    }
  } catch (e) {
    console.error("webhook handler", e);
    return NextResponse.json({ error: "handler" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, handled: "noop" });
}

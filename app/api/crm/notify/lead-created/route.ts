import { NextResponse } from "next/server";
import { requireCrmStaffSession } from "@/lib/crm/crm-api-auth";
import { notifyNewLeadCrm } from "@/lib/crm/crm-notify";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireCrmStaffSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const leadId =
    typeof body === "object" && body !== null && "leadId" in body
      ? String((body as { leadId: unknown }).leadId ?? "").trim()
      : "";
  if (!leadId) {
    return NextResponse.json({ error: "leadId" }, { status: 400 });
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return NextResponse.json({ error: "service role" }, { status: 500 });
  }

  const { data: lead, error } = await admin
    .from("crm_leads")
    .select("id, contact_name, company_name, assigned_to, status")
    .eq("id", leadId)
    .maybeSingle();

  if (error || !lead) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  try {
    await notifyNewLeadCrm({
      id: lead.id,
      contact_name: lead.contact_name,
      company_name: lead.company_name,
      assigned_to: lead.assigned_to,
    });
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ ok: true });
}

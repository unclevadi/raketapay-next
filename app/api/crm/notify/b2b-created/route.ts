import { NextResponse } from "next/server";
import { requireCrmB2bSession } from "@/lib/crm/crm-api-auth";
import { notifyNewB2bDealCrm } from "@/lib/crm/crm-notify";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireCrmB2bSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const dealId =
    typeof body === "object" && body !== null && "dealId" in body
      ? String((body as { dealId: unknown }).dealId ?? "").trim()
      : "";
  if (!dealId) {
    return NextResponse.json({ error: "dealId" }, { status: 400 });
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return NextResponse.json({ error: "service role" }, { status: 500 });
  }

  const { data: deal, error } = await admin
    .from("crm_b2b_deals")
    .select("company_legal_name, assigned_to")
    .eq("id", dealId)
    .maybeSingle();

  if (error || !deal) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  try {
    await notifyNewB2bDealCrm({
      dealId,
      company: deal.company_legal_name,
      assignedTo: deal.assigned_to,
    });
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ ok: true });
}

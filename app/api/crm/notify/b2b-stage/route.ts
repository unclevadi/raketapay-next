import { NextResponse } from "next/server";
import { requireCrmB2bSession } from "@/lib/crm/crm-api-auth";
import { notifyB2bStageChangeCrm } from "@/lib/crm/crm-notify";
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
  const o = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const dealId = String(o.dealId ?? "").trim();
  const fromSlug = o.fromSlug != null ? String(o.fromSlug) : null;
  const toSlug = o.toSlug != null ? String(o.toSlug) : null;
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
    return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
  }

  try {
    await notifyB2bStageChangeCrm({
      dealId,
      company: deal.company_legal_name,
      fromSlug,
      toSlug,
      assignedTo: deal.assigned_to,
    });
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ ok: true });
}

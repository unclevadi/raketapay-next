import { NextResponse } from "next/server";
import JSZip from "jszip";
import { CRM_B2B_DOCUMENTS_BUCKET } from "@/lib/crm/b2b-documents";
import { requireCrmB2bSession } from "@/lib/crm/crm-api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ dealId: string }> }
) {
  const auth = await requireCrmB2bSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { dealId } = await context.params;
  if (!dealId || !/^[0-9a-f-]{36}$/i.test(dealId)) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const { data: dealRow, error: dealErr } = await auth.supabase
    .from("crm_b2b_deals")
    .select("*")
    .eq("id", dealId)
    .maybeSingle();

  if (dealErr || !dealRow) {
    return NextResponse.json({ error: dealErr?.message ?? "Сделка не найдена" }, { status: 404 });
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Сервер без service role" }, { status: 500 });
  }

  const { data: stageRow } = await admin
    .from("crm_b2b_pipeline_stages")
    .select("slug, label")
    .eq("id", (dealRow as { stage_id: string }).stage_id)
    .maybeSingle();

  const { data: docs, error: docsErr } = await admin
    .from("crm_b2b_deal_documents")
    .select("*")
    .eq("deal_id", dealId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 });
  }

  const zip = new JSZip();
  const deal = dealRow as Record<string, unknown>;
  zip.file(
    "deal.json",
    JSON.stringify(
      {
        ...deal,
        _export: {
          exported_at: new Date().toISOString(),
          stage_slug: stageRow?.slug ?? null,
          stage_label: stageRow?.label ?? null,
        },
      },
      null,
      2
    )
  );

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        deal_id: dealId,
        documents: (docs ?? []).map((d) => ({
          id: d.id,
          document_kind: d.document_kind,
          version_index: d.version_index,
          original_filename: d.original_filename,
          storage_path: d.storage_path,
          byte_size: d.byte_size,
          created_at: d.created_at,
        })),
      },
      null,
      2
    )
  );

  const folder = zip.folder("documents");
  for (const d of docs ?? []) {
    const path = d.storage_path as string;
    const { data: blob, error: dlErr } = await admin.storage.from(CRM_B2B_DOCUMENTS_BUCKET).download(path);
    if (dlErr || !blob) {
      folder?.file(
        `_ERROR_${d.id}.txt`,
        `Не удалось скачать: ${path}\n${dlErr?.message ?? ""}`
      );
      continue;
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    const safe = `${d.document_kind}_v${d.version_index ?? 1}_${String(d.original_filename).replace(/[/\\]/g, "_")}`;
    folder?.file(safe, buf);
  }

  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const filename = `b2b-${dealId.slice(0, 8)}.zip`;

  return new NextResponse(new Uint8Array(out), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

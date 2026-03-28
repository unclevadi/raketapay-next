"use client";

import { useCallback, useEffect, useState } from "react";
import { logCrmAudit } from "@/lib/crm/audit";
import {
  CRM_B2B_DOCUMENTS_BUCKET,
  CRM_B2B_DOC_MAX_BYTES,
  CRM_B2B_DOCUMENT_KIND_LABELS,
  CRM_B2B_DOCUMENT_KINDS,
  type CrmB2bDocumentKind,
  sanitizeB2bStorageFileName,
} from "@/lib/crm/b2b-documents";
import {
  crmBtnDanger,
  crmBtnPrimary,
  crmBtnSecondary,
  crmInput,
  crmLabel,
  crmSelect,
  crmTableWrap,
} from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";

export type B2bDealDocRow = {
  id: string;
  deal_id: string;
  storage_path: string;
  original_filename: string;
  content_type: string | null;
  byte_size: number | string;
  document_kind: CrmB2bDocumentKind;
  version_index?: number | string | null;
  uploaded_by: string | null;
  created_at: string;
  deleted_at: string | null;
};

type ManifestDeal = {
  id: string;
  company_legal_name: string;
  transfer_amount: number;
  transfer_currency: string;
  stage_id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  dealId: string;
  deal: ManifestDeal;
  stageLabel: string | null;
};

function formatBytes(n: number | string): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v) || v < 0) return "—";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

export function B2bDealDocumentsPanel({ dealId, deal, stageLabel }: Props) {
  const [docs, setDocs] = useState<B2bDealDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [docKind, setDocKind] = useState<CrmB2bDocumentKind>("other");
  const [msg, setMsg] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);

  const loadDocs = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from("crm_b2b_deal_documents")
      .select("*")
      .eq("deal_id", dealId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      setMsg(error.message);
      setDocs([]);
    } else {
      setDocs((data ?? []) as B2bDealDocRow[]);
    }
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  async function onUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !dealId) return;
    setMsg(null);
    if (file.size > CRM_B2B_DOC_MAX_BYTES) {
      setMsg(`Файл больше ${CRM_B2B_DOC_MAX_BYTES / (1024 * 1024)} МБ.`);
      return;
    }
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMsg("Нет сессии.");
      return;
    }
    const safe = sanitizeB2bStorageFileName(file.name);
    const objectPath = `${dealId}/${crypto.randomUUID()}_${safe}`;
    setUploadBusy(true);
    try {
      const { error: upErr } = await supabase.storage.from(CRM_B2B_DOCUMENTS_BUCKET).upload(objectPath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) {
        setMsg(upErr.message);
        return;
      }
      const { error: insErr } = await supabase.from("crm_b2b_deal_documents").insert({
        deal_id: dealId,
        storage_path: objectPath,
        original_filename: file.name.slice(0, 480),
        content_type: file.type || null,
        byte_size: file.size,
        document_kind: docKind,
        uploaded_by: user.id,
      });
      if (insErr) {
        setMsg(insErr.message);
        return;
      }
      await logCrmAudit(supabase, {
        event_type: "b2b_document_upload",
        entity_table: "crm_b2b_deals",
        entity_id: dealId,
        summary: `Загружен документ: ${CRM_B2B_DOCUMENT_KIND_LABELS[docKind]} — ${file.name}`,
        meta: { storage_path: objectPath, document_kind: docKind },
      });
      setMsg("Файл загружен.");
      await loadDocs();
    } finally {
      setUploadBusy(false);
    }
  }

  async function downloadDoc(row: B2bDealDocRow) {
    setMsg(null);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.storage
      .from(CRM_B2B_DOCUMENTS_BUCKET)
      .createSignedUrl(row.storage_path, 3600);
    if (error || !data?.signedUrl) {
      setMsg(error?.message ?? "Не удалось получить ссылку.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function softDeleteDoc(row: B2bDealDocRow) {
    if (!window.confirm(`Убрать из списка «${row.original_filename}»? Файл останется в хранилище.`)) return;
    setMsg(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("crm_b2b_deal_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("deal_id", dealId);
    if (error) {
      setMsg(error.message);
      return;
    }
    await logCrmAudit(supabase, {
      event_type: "b2b_document_remove",
      entity_table: "crm_b2b_deals",
      entity_id: dealId,
      summary: `Документ скрыт из карточки: ${row.original_filename}`,
      meta: { document_id: row.id, storage_path: row.storage_path },
    });
    await loadDocs();
  }

  async function downloadZipBundle() {
    setMsg(null);
    setZipBusy(true);
    try {
      const r = await fetch(`/api/crm/b2b/${dealId}/export-zip`, { credentials: "include" });
      if (!r.ok) {
        let t = await r.text();
        try {
          const j = JSON.parse(t) as { error?: string };
          if (j.error) t = j.error;
        } catch {
          /* plain text */
        }
        setMsg(t || "Ошибка ZIP");
        return;
      }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `b2b-${dealId.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg("Архив скачан.");
    } finally {
      setZipBusy(false);
    }
  }

  function downloadManifestJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      deal: {
        id: deal.id,
        company_legal_name: deal.company_legal_name,
        transfer_amount: deal.transfer_amount,
        transfer_currency: deal.transfer_currency,
        stage_id: deal.stage_id,
        stage_label: stageLabel,
        created_at: deal.created_at ?? null,
        updated_at: deal.updated_at ?? null,
      },
        documents: docs.map((d) => ({
        id: d.id,
        document_kind: d.document_kind,
        document_kind_label: CRM_B2B_DOCUMENT_KIND_LABELS[d.document_kind],
        version_index: d.version_index ?? 1,
        original_filename: d.original_filename,
        content_type: d.content_type,
        byte_size: d.byte_size,
        created_at: d.created_at,
        uploaded_by: d.uploaded_by,
        storage_path: d.storage_path,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `b2b-${deal.id}-manifest.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-header text-[10px] uppercase tracking-[0.2em] text-violet-200/55">Документы</h2>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-soviet-cream/50">
            Договор, счёт, закрывающие — хранятся в защищённом хранилище. Скачивание по временной ссылке. История
            заявки можно выгрузить в JSON (список файлов и поля сделки); сами файлы — по одному или пакетом позже.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={zipBusy}
            onClick={() => void downloadZipBundle()}
            className={crmBtnPrimary}
          >
            {zipBusy ? "ZIP…" : "Скачать ZIP (данные + файлы)"}
          </button>
          <button
            type="button"
            disabled={loading || docs.length === 0}
            onClick={downloadManifestJson}
            className={crmBtnSecondary}
          >
            Manifest JSON
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[200px] flex-1 space-y-1">
          <span className={crmLabel}>Тип документа</span>
          <select
            value={docKind}
            onChange={(e) => setDocKind(e.target.value as CrmB2bDocumentKind)}
            className={crmSelect}
          >
            {CRM_B2B_DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {CRM_B2B_DOCUMENT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={crmLabel}>Файл (до 50 МБ)</span>
          <input
            type="file"
            disabled={uploadBusy}
            onChange={(e) => {
              void onUpload(e.target.files);
              e.target.value = "";
            }}
            className={`${crmInput} cursor-pointer py-2 file:mr-3 file:rounded-md file:border-0 file:bg-violet-600/80 file:px-3 file:py-1 file:font-header file:text-[10px] file:uppercase file:tracking-wider file:text-white`}
          />
        </label>
      </div>

      {msg ? (
        <p
          className={`mt-3 text-sm ${msg.includes("загружен") || msg.includes("Архив") ? "text-emerald-300/90" : "text-red-300/90"}`}
        >
          {msg}
        </p>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-soviet-cream/45">Загрузка списка…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-soviet-cream/45">Пока нет прикреплённых файлов.</p>
        ) : (
          <div className={crmTableWrap}>
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
              <thead className="border-b border-white/10 bg-zinc-900 text-[10px] uppercase tracking-wide text-soviet-cream/50">
                <tr>
                  <th className="px-3 py-2.5 font-header font-normal">Тип</th>
                  <th className="px-3 py-2.5 font-header font-normal">Файл</th>
                  <th className="px-3 py-2.5 font-header font-normal tabular-nums">Размер</th>
                  <th className="px-3 py-2.5 font-header font-normal">Дата</th>
                  <th className="px-3 py-2.5 font-header font-normal text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-white/[0.06] transition-colors duration-200 even:bg-white/[0.02] hover:bg-white/[0.05]"
                  >
                    <td className="px-3 py-2.5 text-soviet-cream/80">
                      {CRM_B2B_DOCUMENT_KIND_LABELS[d.document_kind]}
                      <span className="ml-1 font-mono text-[10px] text-violet-300/80">
                        v{Number(d.version_index ?? 1)}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-soviet-cream/90" title={d.original_filename}>
                      {d.original_filename}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-soviet-cream/65">{formatBytes(d.byte_size)}</td>
                    <td className="px-3 py-2.5 text-[12px] text-soviet-cream/55">
                      {new Date(d.created_at).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={() => void downloadDoc(d)} className={crmBtnSecondary}>
                          Открыть
                        </button>
                        <button type="button" onClick={() => void softDeleteDoc(d)} className={crmBtnDanger}>
                          Скрыть
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

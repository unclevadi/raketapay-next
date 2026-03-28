"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildTemplateDealFields,
  renderB2bTemplate,
  renderB2bTemplateHtml,
} from "@/lib/crm/b2b-template-render";
import { crmBtnSecondary, crmLabel, crmSelect, crmTextarea } from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  subject_template: string;
  body_template: string;
};

type Props = {
  dealId: string;
  dealRecord: Record<string, unknown>;
  stageLabel: string | null;
};

export function B2bDealTemplatesPanel({ dealId, dealRecord, stageLabel }: Props) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [sel, setSel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const fields = useMemo(
    () => buildTemplateDealFields(dealRecord, { stage_label: stageLabel }),
    [dealRecord, stageLabel]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from("crm_b2b_email_templates")
      .select("id, slug, name, subject_template, body_template")
      .order("sort_order", { ascending: true });
    if (error) {
      setMsg(error.message);
      setTemplates([]);
    } else {
      const list = (data ?? []) as TemplateRow[];
      setTemplates(list);
      setSel((prev) => (prev && list.some((t) => t.id === prev) ? prev : list[0]?.id ?? ""));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [dealId, load]);

  const current = templates.find((t) => t.id === sel) ?? templates[0];
  const subjectRendered = current ? renderB2bTemplate(current.subject_template, fields) : "";
  const bodyRendered = current ? renderB2bTemplate(current.body_template, fields) : "";
  const bodyHtml = current ? renderB2bTemplateHtml(current.body_template, fields) : "";

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
    setMsg("Скопировано в буфер.");
  }

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4">
      <h2 className="font-header text-[10px] uppercase tracking-[0.2em] text-amber-300/85">
        Шаблоны писем / КП
      </h2>
      <p className="mt-1 text-[12px] text-soviet-cream/45">
        Плейсхолдеры вида <code className="text-tech-cyan/80">{"{{company_legal_name}}"}</code>,{" "}
        <code className="text-tech-cyan/80">{"{{transfer_amount}}"}</code>,{" "}
        <code className="text-tech-cyan/80">{"{{stage_label}}"}</code>,{" "}
        <code className="text-tech-cyan/80">{"{{contact_greeting}}"}</code> и др. Редактирование шаблонов — в разделе
        «Шаблоны B2B» (админ).
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-soviet-cream/45">Загрузка шаблонов…</p>
      ) : templates.length === 0 ? (
        <p className="mt-3 text-sm text-soviet-cream/45">Нет шаблонов (проверьте миграцию и права).</p>
      ) : (
        <>
          <label className="mt-3 block space-y-1">
            <span className={crmLabel}>Шаблон</span>
            <select value={current?.id ?? ""} onChange={(e) => setSel(e.target.value)} className={crmSelect}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-zinc-950/50 p-3">
            <p className="text-[10px] uppercase text-soviet-cream/40">Тема</p>
            <p className="text-sm text-soviet-cream/88">{subjectRendered}</p>
            <button type="button" className={crmBtnSecondary} onClick={() => copyText(subjectRendered)}>
              Копировать тему
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <p className={crmLabel}>Текст</p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-zinc-950/80 p-3 text-[12px] text-soviet-cream/80">
              {bodyRendered}
            </pre>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={crmBtnSecondary} onClick={() => copyText(bodyRendered)}>
                Копировать текст
              </button>
            </div>
            <p className="text-[10px] uppercase text-soviet-cream/35">Предпросмотр HTML (для почты)</p>
            <div
              className="rounded-lg border border-white/10 bg-zinc-900/60 p-3 text-[13px] text-soviet-cream/85"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
        </>
      )}

      {msg ? <p className="mt-2 text-sm text-emerald-300/85">{msg}</p> : null}
    </section>
  );
}

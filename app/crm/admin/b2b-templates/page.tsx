"use client";

import { useCallback, useEffect, useState } from "react";
import {
  crmBtnDanger,
  crmBtnPrimary,
  crmBtnSecondary,
  crmErrorBanner,
  crmInput,
  crmLabel,
  crmTextarea,
} from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmPageShell } from "../../CrmPageShell";
import { useCrmAccess } from "../../CrmAccessProvider";
import Link from "next/link";

type Row = {
  id: string;
  slug: string;
  name: string;
  subject_template: string;
  body_template: string;
  sort_order: number;
};

const empty = (): Omit<Row, "id"> => ({
  slug: "",
  name: "",
  subject_template: "",
  body_template: "",
  sort_order: 0,
});

export default function CrmB2bTemplatesAdminPage() {
  const { staff, loading: accessLoading } = useCrmAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Row, "id"> | (Omit<Row, "id"> & { id: string })>(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from("crm_b2b_email_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) setMsg(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (accessLoading || !staff?.is_admin) return;
    void load();
  }, [accessLoading, staff?.is_admin, load]);

  if (!accessLoading && !staff?.is_admin) {
    return (
      <CrmPageShell title="Нет доступа" variant="md">
        <p className="text-sm text-soviet-cream/60">Только для администраторов CRM.</p>
        <Link href="/crm" className="mt-4 inline-block text-tech-cyan/90">
          Обзор
        </Link>
      </CrmPageShell>
    );
  }

  function startNew() {
    setEditingId(null);
    setDraft(empty());
    setMsg(null);
  }

  function startEdit(r: Row) {
    setEditingId(r.id);
    setDraft({
      id: r.id,
      slug: r.slug,
      name: r.name,
      subject_template: r.subject_template,
      body_template: r.body_template,
      sort_order: r.sort_order,
    });
    setMsg(null);
  }

  async function save() {
    setMsg(null);
    const supabase = supabaseBrowser();
    const slug = draft.slug.trim();
    const name = draft.name.trim();
    if (!slug || !name) {
      setMsg("Slug и название обязательны.");
      return;
    }
    if (editingId) {
      const { error } = await supabase
        .from("crm_b2b_email_templates")
        .update({
          slug,
          name,
          subject_template: draft.subject_template,
          body_template: draft.body_template,
          sort_order: draft.sort_order,
        })
        .eq("id", editingId);
      if (error) setMsg(error.message);
      else {
        await load();
        startNew();
      }
    } else {
      const { error } = await supabase.from("crm_b2b_email_templates").insert({
        slug,
        name,
        subject_template: draft.subject_template,
        body_template: draft.body_template,
        sort_order: draft.sort_order,
      });
      if (error) setMsg(error.message);
      else {
        await load();
        startNew();
      }
    }
  }

  async function remove(id: string) {
    if (!confirm("Удалить шаблон?")) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("crm_b2b_email_templates").delete().eq("id", id);
    if (error) setMsg(error.message);
    else {
      await load();
      if (editingId === id) startNew();
    }
  }

  return (
    <CrmPageShell
      title="Шаблоны B2B"
      description="Тема и текст письма с плейсхолдерами {{company_legal_name}}, {{stage_label}}, {{transfer_amount}} и др."
      variant="lg"
      prepend={
        <Link
          href="/crm/b2b"
          className="text-[11px] uppercase tracking-widest text-tech-cyan/88 transition-colors duration-200 hover:text-tech-cyan"
        >
          ← B2B
        </Link>
      }
    >
      {msg ? <div className={`mb-6 ${crmErrorBanner}`}>{msg}</div> : null}

      {loading ? <p className="text-sm text-soviet-cream/45">Загрузка…</p> : null}

      <section className="mb-10 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
        <h2 className="font-header text-xs uppercase tracking-[0.2em] text-soviet-cream/50">
          {editingId ? "Редактирование" : "Новый шаблон"}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className={crmLabel}>Slug (латиница, уникальный)</span>
            <input
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              className={crmInput}
              disabled={Boolean(editingId)}
            />
          </label>
          <label className="block space-y-1">
            <span className={crmLabel}>Название</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className={crmInput}
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className={crmLabel}>Тема</span>
            <input
              value={draft.subject_template}
              onChange={(e) => setDraft((d) => ({ ...d, subject_template: e.target.value }))}
              className={crmInput}
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className={crmLabel}>Текст</span>
            <textarea
              value={draft.body_template}
              onChange={(e) => setDraft((d) => ({ ...d, body_template: e.target.value }))}
              rows={8}
              className={crmTextarea}
            />
          </label>
          <label className="block space-y-1">
            <span className={crmLabel}>Порядок</span>
            <input
              type="number"
              value={draft.sort_order}
              onChange={(e) =>
                setDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))
              }
              className={crmInput}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} className={crmBtnPrimary}>
            Сохранить
          </button>
          <button type="button" onClick={startNew} className={crmBtnSecondary}>
            Очистить
          </button>
        </div>
      </section>

      <h2 className="font-header text-xs uppercase tracking-[0.2em] text-soviet-cream/50">Список</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-soviet-cream/90">{r.name}</p>
              <p className="font-mono text-[11px] text-soviet-cream/45">{r.slug}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => startEdit(r)} className={crmBtnSecondary}>
                Изменить
              </button>
              <button type="button" onClick={() => void remove(r.id)} className={crmBtnDanger}>
                Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>
    </CrmPageShell>
  );
}

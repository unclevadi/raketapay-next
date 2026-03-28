"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { b2bStageGateMessage } from "@/lib/crm/b2b-stage-gates";
import { logCrmAudit } from "@/lib/crm/audit";
import { downloadCsv, rowsToCsv } from "@/lib/crm/csv";
import { fetchCrmStaffOptions, staffEmailById, type CrmStaffOption } from "@/lib/crm/staff-directory";
import { canCloseDealSuccess } from "@/lib/crm/staff-access";
import { crmErrorBanner } from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmPageShell } from "../CrmPageShell";
import { useCrmAccess } from "../CrmAccessProvider";

type Stage = { id: string; slug: string; label: string; sort_order: number };

type B2bRow = {
  id: string;
  company_legal_name: string;
  country_code: string;
  transfer_amount: number;
  transfer_currency: string;
  deal_tier: string;
  priority: number;
  stage_id: string;
  target_close_date: string | null;
  contact_name: string | null;
  assigned_to: string | null;
  /** PostgREST иногда типизирует как массив для embed — нормализуем при загрузке. */
  crm_b2b_pipeline_stages: { label: string; slug: string } | null;
};

function normalizeStageEmbed(
  v: { label: string; slug: string } | { label: string; slug: string }[] | null | undefined
): { label: string; slug: string } | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const TIERS: { value: string; label: string }[] = [
  { value: "tier_s", label: "S" },
  { value: "tier_m", label: "M" },
  { value: "tier_l", label: "L" },
  { value: "tier_xl", label: "XL" },
];

const CURRENCIES = ["USD", "EUR", "RUB", "UZS", "GBP", "OTHER"] as const;

const emptyCreate = () => ({
  company_legal_name: "",
  country_code: "",
  tax_id: "",
  counterparty_country: "",
  transfer_amount: "",
  transfer_currency: "USD" as (typeof CURRENCIES)[number],
  purpose_summary: "",
  stage_id: "",
  deal_tier: "tier_m",
  priority: "2",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  internal_notes: "",
  compliance_notes: "",
  expected_margin_usd: "",
  target_close_date: "",
  assigned_to: "" as string,
});

export default function CrmB2bListPage() {
  const { staff } = useCrmAccess();
  const canConfirm = canCloseDealSuccess(staff);
  const [stages, setStages] = useState<Stage[]>([]);
  const [rows, setRows] = useState<B2bRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCreate);
  const [staffOptions, setStaffOptions] = useState<CrmStaffOption[]>([]);
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);

  const staffEmailMap = useMemo(() => staffEmailById(staffOptions), [staffOptions]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const [{ data: st, error: eSt }, { data: deals, error: eDeals }, staffRes] = await Promise.all([
      supabase.from("crm_b2b_pipeline_stages").select("id, slug, label, sort_order").order("sort_order"),
      supabase
        .from("crm_b2b_deals")
        .select(
          "id, company_legal_name, country_code, transfer_amount, transfer_currency, deal_tier, priority, stage_id, target_close_date, contact_name, assigned_to, crm_b2b_pipeline_stages(label, slug)"
        )
        .order("created_at", { ascending: false })
        .limit(200),
      fetchCrmStaffOptions(supabase),
    ]);
    if (!staffRes.error) setStaffOptions(staffRes.options);
    if (eSt) setMsg(eSt.message);
    else setStages((st ?? []) as Stage[]);
    if (eDeals) setMsg(eDeals.message);
    else
      setRows(
        (deals ?? []).map((d) => {
          const raw = d as Record<string, unknown>;
          return {
            ...(d as Omit<B2bRow, "crm_b2b_pipeline_stages" | "assigned_to">),
            assigned_to: (raw.assigned_to as string | null | undefined) ?? null,
            crm_b2b_pipeline_stages: normalizeStageEmbed(
              (d as { crm_b2b_pipeline_stages?: B2bRow["crm_b2b_pipeline_stages"] | unknown[] })
                .crm_b2b_pipeline_stages as Parameters<typeof normalizeStageEmbed>[0]
            ),
          };
        })
      );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const cc = form.country_code.trim().toUpperCase();
    const tax = form.tax_id.trim();
    if (cc.length !== 2 || tax.length < 3) {
      setDuplicateHint(null);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        const supabase = supabaseBrowser();
        const { data, error } = await supabase
          .from("crm_b2b_deals")
          .select("id, company_legal_name")
          .eq("country_code", cc)
          .eq("tax_id", tax)
          .limit(5);
        if (error) {
          setDuplicateHint(null);
          return;
        }
        const list = data ?? [];
        if (list.length === 0) {
          setDuplicateHint(null);
          return;
        }
        const names = list.map((r) => (r as { company_legal_name: string }).company_legal_name).join("; ");
        setDuplicateHint(`Возможные дубли по ИНН+стране: ${names}`);
      })();
    }, 450);
    return () => window.clearTimeout(t);
  }, [form.country_code, form.tax_id]);

  useEffect(() => {
    if (!stages.length || form.stage_id) return;
    const def = stages.find((s) => s.slug === "inquiry") ?? stages[0];
    if (def) setForm((f) => ({ ...f, stage_id: def.id }));
  }, [stages, form.stage_id]);

  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  async function createDeal() {
    setSaving(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const amt = Number(form.transfer_amount.replace(",", "."));
    if (!form.company_legal_name.trim() || !form.country_code.trim() || form.country_code.length !== 2) {
      setMsg("Укажите название компании и код страны (2 буквы, например DE).");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setMsg("Сумма перевода должна быть положительным числом.");
      setSaving(false);
      return;
    }
    if (!form.stage_id) {
      setMsg("Выберите стадию.");
      setSaving(false);
      return;
    }
    const pr = Number(form.priority);
    const priority = Number.isFinite(pr) && pr >= 1 && pr <= 4 ? pr : 2;
    const marginRaw = form.expected_margin_usd.trim();
    const marginN = marginRaw ? Number(marginRaw.replace(",", ".")) : null;
    const targetSlug = stages.find((s) => s.id === form.stage_id)?.slug ?? "";
    const gateMsg = b2bStageGateMessage(
      {
        company_legal_name: form.company_legal_name.trim(),
        country_code: form.country_code.trim().toUpperCase(),
        transfer_amount: amt,
        tax_id: form.tax_id.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        purpose_summary: form.purpose_summary.trim() || null,
        expected_margin_usd: marginN,
      },
      targetSlug
    );
    if (gateMsg) {
      setMsg(gateMsg);
      setSaving(false);
      return;
    }

    const { data: created, error } = await supabase
      .from("crm_b2b_deals")
      .insert({
        company_legal_name: form.company_legal_name.trim(),
        country_code: form.country_code.trim().toUpperCase(),
        tax_id: form.tax_id.trim() || null,
        counterparty_country: form.counterparty_country.trim() || null,
        transfer_amount: amt,
        transfer_currency: form.transfer_currency,
        purpose_summary: form.purpose_summary.trim() || null,
        stage_id: form.stage_id,
        deal_tier: form.deal_tier,
        priority,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
        compliance_notes: form.compliance_notes.trim() || null,
        expected_margin_usd:
          marginN !== null && Number.isFinite(marginN) ? marginN : null,
        target_close_date: form.target_close_date.trim() || null,
        assigned_to: form.assigned_to.trim() || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) setMsg(error.message);
    else {
      const newId = (created as { id?: string } | null)?.id;
      if (newId) {
        void fetch("/api/crm/notify/b2b-created", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ dealId: newId }),
        });
      }
      const def = stages.find((s) => s.slug === "inquiry") ?? stages[0];
      setForm({ ...emptyCreate(), stage_id: def?.id ?? "" });
      await load();
    }
    setSaving(false);
  }

  async function setB2bStageBySlug(dealId: string, slug: string) {
    if ((slug === "completed" || slug === "rejected") && !canConfirm) {
      setMsg("Нет права закрывать сделку успехом или отказом.");
      return;
    }
    const st = stages.find((s) => s.slug === slug);
    if (!st) {
      setMsg(`Нет этапа «${slug}» в справочнике.`);
      return;
    }
    const row = rows.find((r) => r.id === dealId);
    const prevSlug =
      row?.crm_b2b_pipeline_stages?.slug ?? stageById.get(row?.stage_id ?? "")?.slug;
    setRowBusy(dealId);
    setMsg(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("crm_b2b_deals")
      .update({ stage_id: st.id })
      .eq("id", dealId);
    setRowBusy(null);
    if (error) setMsg(error.message);
    else {
      if (prevSlug !== slug) {
        await logCrmAudit(supabase, {
          event_type: "b2b_stage_changed",
          entity_table: "crm_b2b_deals",
          entity_id: dealId,
          summary: `B2B этап: ${prevSlug ?? "?"} → ${slug}`,
          meta: { from_slug: prevSlug, to_slug: slug },
        });
        void fetch("/api/crm/notify/b2b-stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            dealId,
            fromSlug: prevSlug ?? null,
            toSlug: slug,
          }),
        });
      }
      await load();
    }
  }

  async function duplicateB2b(dealId: string) {
    setMsg(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const inquiry = stages.find((s) => s.slug === "inquiry");
    if (!inquiry) {
      setMsg("Нет этапа inquiry в справочнике.");
      return;
    }
    const { data: full, error } = await supabase
      .from("crm_b2b_deals")
      .select("*")
      .eq("id", dealId)
      .maybeSingle();
    if (error || !full) {
      setMsg(error?.message ?? "Не удалось прочитать сделку.");
      return;
    }
    const row = full as Record<string, unknown>;
    const omit = new Set(["id", "created_at", "updated_at"]);
    const insert: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (omit.has(k)) continue;
      insert[k] = v;
    }
    insert.stage_id = inquiry.id;
    insert.assigned_to = null;
    insert.created_by = user?.id ?? null;
    const { error: insErr } = await supabase.from("crm_b2b_deals").insert(insert);
    if (insErr) setMsg(insErr.message);
    else {
      await load();
      await logCrmAudit(supabase, {
        event_type: "b2b_deal_duplicated",
        entity_table: "crm_b2b_deals",
        entity_id: dealId,
        summary: "Дублирование B2B-сделки",
        meta: { source_deal_id: dealId },
      });
    }
  }

  function exportB2bCsv() {
    const headers = [
      "company_legal_name",
      "manager",
      "contact_name",
      "country_code",
      "transfer_amount",
      "transfer_currency",
      "stage",
      "tier",
      "target_close_date",
    ];
    const body = rows.map((r) => {
      const stLabel =
        r.crm_b2b_pipeline_stages?.label ?? stageById.get(r.stage_id)?.label ?? "";
      const tierLabel = TIERS.find((t) => t.value === r.deal_tier)?.label ?? r.deal_tier;
      return [
        r.company_legal_name,
        r.assigned_to ? (staffEmailMap.get(r.assigned_to) ?? r.assigned_to) : "",
        r.contact_name ?? "",
        r.country_code,
        String(r.transfer_amount),
        r.transfer_currency,
        stLabel,
        tierLabel,
        r.target_close_date ?? "",
      ];
    });
    downloadCsv(`crm-b2b-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(headers, body));
  }

  return (
    <CrmPageShell
      title="Юридические лица"
      titleClassName="font-header text-2xl font-black uppercase italic tracking-tight text-violet-200/95 sm:text-[1.65rem]"
      description="Сначала — компания, сумма, стадия и менеджер. Контакты и экономику можно развернуть ниже."
      variant="xl"
    >
      {msg ? <div className={`mb-6 ${crmErrorBanner}`}>{msg}</div> : null}
      {duplicateHint ? (
        <div className="mb-6 rounded-lg border border-amber-500/35 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
          {duplicateHint}
        </div>
      ) : null}

      <section className="rounded-2xl border border-violet-500/25 bg-violet-950/15 p-5 shadow-sm">
        <h2 className="font-header text-xs uppercase tracking-[0.2em] text-violet-300/90">
          Новая сделка
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">Компания</span>
            <input
              value={form.company_legal_name}
              onChange={(e) => setForm((f) => ({ ...f, company_legal_name: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">Страна (ISO2)</span>
            <input
              value={form.country_code}
              onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value }))}
              maxLength={2}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm uppercase"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">ИНН / tax id</span>
            <input
              value={form.tax_id}
              onChange={(e) => setForm((f) => ({ ...f, tax_id: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Для этапов «Договор» и далее обязателен"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">Сумма перевода</span>
            <input
              value={form.transfer_amount}
              onChange={(e) => setForm((f) => ({ ...f, transfer_amount: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">Валюта</span>
            <select
              value={form.transfer_currency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  transfer_currency: e.target.value as (typeof CURRENCIES)[number],
                }))
              }
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">Стадия</span>
            <select
              value={form.stage_id}
              onChange={(e) => setForm((f) => ({ ...f, stage_id: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[10px] uppercase text-soviet-cream/45">Менеджер</span>
            <select
              value={form.assigned_to}
              onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
              className="w-full max-w-md rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="">Не назначен</option>
              {staffOptions.map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.email ?? s.user_id.slice(0, 8) + "…"}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[10px] uppercase text-soviet-cream/45">Назначение / кратко</span>
            <input
              value={form.purpose_summary}
              onChange={(e) => setForm((f) => ({ ...f, purpose_summary: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <details className="mt-6 rounded-xl border border-violet-500/20 bg-violet-950/10 p-4">
          <summary className="cursor-pointer font-header text-[10px] uppercase tracking-[0.2em] text-violet-300/90">
            Уровень, приоритет, контакт и экономика
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-soviet-cream/45">Уровень сделки</span>
              <select
                value={form.deal_tier}
                onChange={(e) => setForm((f) => ({ ...f, deal_tier: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
              >
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-soviet-cream/45">Приоритет (1–4)</span>
              <input
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <h3 className="mt-6 font-header text-[10px] uppercase tracking-[0.18em] text-violet-400/80">
            Контакт
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">ФИО / имя</span>
            <input
              value={form.contact_name}
              onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">Email</span>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[10px] uppercase text-soviet-cream/45">Телефон</span>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <h3 className="mt-6 font-header text-[10px] uppercase tracking-[0.18em] text-violet-400/80">
          Экономика и заметки
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">Ожидаемая маржа, USD</span>
            <input
              value={form.expected_margin_usd}
              onChange={(e) => setForm((f) => ({ ...f, expected_margin_usd: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="0"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-soviet-cream/45">Целевая дата закрытия</span>
            <input
              type="date"
              value={form.target_close_date}
              onChange={(e) => setForm((f) => ({ ...f, target_close_date: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[10px] uppercase text-soviet-cream/45">Внутренние заметки</span>
            <input
              value={form.internal_notes}
              onChange={(e) => setForm((f) => ({ ...f, internal_notes: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>
        </div>
        </details>

        <button
          type="button"
          disabled={saving}
          onClick={() => void createDeal()}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2.5 font-header text-[11px] uppercase tracking-widest text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? "Создание…" : "Добавить сделку"}
        </button>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-header text-xs uppercase tracking-[0.2em] text-soviet-cream/50">
            Список
          </h2>
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => exportB2bCsv()}
            className="rounded-lg border border-white/20 px-3 py-1.5 font-header text-[10px] uppercase tracking-widest text-soviet-cream/75 hover:bg-white/5 disabled:opacity-35"
          >
            CSV
          </button>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-soviet-cream/50">Загрузка…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-soviet-cream/50">Пока нет записей.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead className="border-b border-white/10 bg-zinc-900/80 text-[10px] uppercase tracking-wider text-soviet-cream/45">
                <tr>
                  <th className="px-3 py-2">Компания</th>
                  <th className="px-3 py-2">Менеджер</th>
                  <th className="px-3 py-2">Контакт</th>
                  <th className="px-3 py-2">Страна</th>
                  <th className="px-3 py-2">Сумма</th>
                  <th className="px-3 py-2">Стадия</th>
                  <th className="px-3 py-2">Успех / отказ</th>
                  <th className="px-3 py-2">Уровень</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const tierLabel = TIERS.find((t) => t.value === r.deal_tier)?.label ?? r.deal_tier;
                  const stageSlug =
                    r.crm_b2b_pipeline_stages?.slug ?? stageById.get(r.stage_id)?.slug;
                  const busy = rowBusy === r.id;
                  return (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-3 py-2 font-medium text-soviet-cream/90">
                        {r.company_legal_name}
                      </td>
                      <td className="max-w-[100px] truncate px-3 py-2 text-[12px] text-soviet-cream/60" title={r.assigned_to ? staffEmailMap.get(r.assigned_to) : ""}>
                        {r.assigned_to ? staffEmailMap.get(r.assigned_to) ?? "—" : "—"}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-soviet-cream/65" title={r.contact_name ?? ""}>
                        {r.contact_name?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2 text-soviet-cream/70">{r.country_code}</td>
                      <td className="px-3 py-2 text-soviet-cream/80">
                        {Number(r.transfer_amount).toLocaleString("ru-RU")} {r.transfer_currency}
                      </td>
                      <td className="px-3 py-2 text-violet-300/90">
                        {r.crm_b2b_pipeline_stages?.label ??
                          stageById.get(r.stage_id)?.label ??
                          "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {stageSlug !== "completed" && canConfirm ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void setB2bStageBySlug(r.id, "completed")}
                              className="rounded border border-emerald-500/35 px-2 py-1 font-header text-[9px] uppercase text-emerald-200/90 hover:bg-emerald-500/10 disabled:opacity-40"
                            >
                              Успех
                            </button>
                          ) : null}
                          {stageSlug !== "rejected" && canConfirm ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void setB2bStageBySlug(r.id, "rejected")}
                              className="rounded border border-zinc-500/40 px-2 py-1 font-header text-[9px] uppercase text-zinc-400 hover:bg-white/5 disabled:opacity-40"
                            >
                              Отказ
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-soviet-cream/65">{tierLabel}</td>
                      <td className="px-3 py-2 text-right space-y-1">
                        <Link
                          href={`/crm/b2b/${r.id}`}
                          className="block text-tech-cyan/90 hover:text-tech-cyan text-[11px] uppercase tracking-wide"
                        >
                          Открыть
                        </Link>
                        <button
                          type="button"
                          onClick={() => void duplicateB2b(r.id)}
                          className="block w-full text-left font-header text-[10px] uppercase tracking-wide text-soviet-cream/45 hover:text-soviet-cream/75"
                        >
                          Дубль
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </CrmPageShell>
  );
}

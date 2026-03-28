"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isLeadNewOverSla } from "@/lib/crm/lead-sla";
import {
  CRM_LEAD_INTENDED_LABELS,
  CRM_LEAD_STATUS_LABELS,
} from "@/lib/crm/lead-meta";
import { logCrmAudit } from "@/lib/crm/audit";
import { rowsToCsv, downloadCsv } from "@/lib/crm/csv";
import {
  crmBtnPrimary,
  crmBtnSecondary,
  crmCardAccentSky,
  crmErrorBanner,
  crmInput,
  crmLabel,
  crmSelect,
  crmTable,
  crmTableWrap,
  crmTd,
  crmTextarea,
  crmTh,
  crmThead,
  crmTrEven,
} from "@/lib/crm/crm-ui";
import { fetchCrmStaffOptions, staffEmailById, type CrmStaffOption } from "@/lib/crm/staff-directory";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmEmptyState } from "../CrmEmptyState";
import { CrmPageShell } from "../CrmPageShell";
import { CrmTableSkeleton } from "../CrmSkeletons";

type LeadRow = {
  id: string;
  status: string;
  source: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  company_name: string | null;
  intended_segment: string | null;
  assigned_to: string | null;
  created_at: string;
};

const STATUSES = Object.keys(CRM_LEAD_STATUS_LABELS) as (keyof typeof CRM_LEAD_STATUS_LABELS)[];

export default function CrmLeadsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [staffOptions, setStaffOptions] = useState<CrmStaffOption[]>([]);
  const [slaOnly, setSlaOnly] = useState(false);
  const [form, setForm] = useState({
    intended_segment: "" as "" | "retail" | "b2b",
    assigned_to: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    contact_telegram: "",
    company_name: "",
    source: "",
    campaign: "",
    message: "",
  });

  const staffEmailMap = useMemo(() => staffEmailById(staffOptions), [staffOptions]);

  const displayRows = useMemo(() => {
    if (!slaOnly) return rows;
    return rows.filter((r) => r.status === "new" && isLeadNewOverSla(r.created_at));
  }, [rows, slaOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const supabase = supabaseBrowser();

    let q = supabase
      .from("crm_leads")
      .select(
        "id, status, source, contact_name, contact_phone, contact_email, company_name, intended_segment, assigned_to, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (statusFilter !== "all") {
      q = q.eq("status", statusFilter);
    }

    const [staffRes, leadsRes] = await Promise.all([fetchCrmStaffOptions(supabase), q]);
    if (!staffRes.error) setStaffOptions(staffRes.options);

    if (leadsRes.error) {
      setMsg(leadsRes.error.message);
      setRows([]);
    } else {
      setRows((leadsRes.data ?? []) as LeadRow[]);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("sla") === "1") setSlaOnly(true);
  }, []);

  async function createLeadAndOpenDeal() {
    if (!form.contact_name.trim()) {
      setMsg("Укажите имя или название контакта.");
      return;
    }
    if (form.intended_segment !== "retail" && form.intended_segment !== "b2b") {
      setMsg("Выберите: физлицо или юрлицо.");
      return;
    }
    if (form.intended_segment === "b2b" && !form.company_name.trim() && !form.contact_name.trim()) {
      setMsg("Для юрлица укажите название компании или контакт.");
      return;
    }

    setSaving(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const assign = form.assigned_to.trim() || null;

    const { data: leadIns, error: leadErr } = await supabase
      .from("crm_leads")
      .insert({
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_telegram: form.contact_telegram.trim() || null,
        company_name: form.company_name.trim() || null,
        source: form.source.trim() || null,
        campaign: form.campaign.trim() || null,
        message: form.message.trim() || null,
        status: "new",
        intended_segment: form.intended_segment,
        assigned_to: assign,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (leadErr || !leadIns?.id) {
      setMsg(leadErr?.message ?? "Не удалось создать заявку.");
      setSaving(false);
      return;
    }

    const leadId = leadIns.id as string;

    void fetch("/api/crm/notify/lead-created", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ leadId }),
    });

    if (form.intended_segment === "retail") {
      const line = (form.message.trim() || "Заявка из CRM").slice(0, 800);
      const { data: dealRow, error: dErr } = await supabase
        .from("crm_deals")
        .insert({
          client_name: form.contact_name.trim(),
          contact_telegram: form.contact_telegram.trim() || null,
          contact_email: form.contact_email.trim() || null,
          contact_phone: form.contact_phone.trim() || null,
          service_id: null,
          custom_line_description: line,
          client_amount: 0.01,
          client_currency: "RUB",
          payment_method: "other",
          paid_at: new Date().toISOString(),
          deal_outcome: "open",
          created_by: user?.id ?? null,
          assigned_to: assign,
        })
        .select("id")
        .single();

      if (dErr || !dealRow?.id) {
        setMsg(dErr?.message ?? "Заявка создана, но не удалось создать сделку физлица.");
        setSaving(false);
        await load();
        return;
      }
      const dealId = dealRow.id as string;
      await supabase
        .from("crm_leads")
        .update({
          status: "converted",
          converted_retail_deal_id: dealId,
        })
        .eq("id", leadId);
      await logCrmAudit(supabase, {
        event_type: "lead_converted_retail",
        entity_table: "crm_leads",
        entity_id: leadId,
        summary: "Новая заявка → сделка физлица (с формы)",
        meta: { retail_deal_id: dealId },
      });
      setSaving(false);
      resetForm();
      setShowForm(false);
      router.push("/crm/deals");
      return;
    }

    const { data: st } = await supabase
      .from("crm_b2b_pipeline_stages")
      .select("id")
      .eq("slug", "inquiry")
      .maybeSingle();
    if (!st?.id) {
      setMsg("Нет этапа inquiry в справочнике B2B. Заявка сохранена без сделки.");
      setSaving(false);
      await load();
      return;
    }
    const company = (form.company_name.trim() || form.contact_name.trim()).slice(0, 240);
    const { data: b2bRow, error: bErr } = await supabase
      .from("crm_b2b_deals")
      .insert({
        company_legal_name: company,
        country_code: "RU",
        transfer_amount: 1,
        transfer_currency: "USD",
        purpose_summary: form.message.trim()?.slice(0, 500) || null,
        stage_id: st.id,
        deal_tier: "tier_m",
        priority: 2,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        created_by: user?.id ?? null,
        assigned_to: assign,
      })
      .select("id")
      .single();

    if (bErr || !b2bRow?.id) {
      setMsg(bErr?.message ?? "Заявка создана, но не удалось создать B2B.");
      setSaving(false);
      await load();
      return;
    }
    const b2bId = b2bRow.id as string;
    await supabase
      .from("crm_leads")
      .update({
        status: "converted",
        converted_b2b_deal_id: b2bId,
      })
      .eq("id", leadId);
    await logCrmAudit(supabase, {
      event_type: "lead_converted_b2b",
      entity_table: "crm_leads",
      entity_id: leadId,
      summary: "Новая заявка → B2B (с формы)",
      meta: { b2b_deal_id: b2bId },
    });
    setSaving(false);
    resetForm();
    setShowForm(false);
    router.push(`/crm/b2b/${b2bId}`);
  }

  function resetForm() {
    setForm({
      intended_segment: "",
      assigned_to: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      contact_telegram: "",
      company_name: "",
      source: "",
      campaign: "",
      message: "",
    });
  }

  function exportCsv() {
    const h = [
      "id",
      "status",
      "type",
      "manager",
      "source",
      "contact_name",
      "phone",
      "email",
      "company",
      "created_at",
    ];
    const body = displayRows.map((r) => [
      r.id,
      CRM_LEAD_STATUS_LABELS[r.status] ?? r.status,
      r.intended_segment ? CRM_LEAD_INTENDED_LABELS[r.intended_segment] ?? r.intended_segment : "",
      r.assigned_to ? staffEmailMap.get(r.assigned_to) ?? "" : "",
      r.source ?? "",
      r.contact_name,
      r.contact_phone ?? "",
      r.contact_email ?? "",
      r.company_name ?? "",
      r.created_at,
    ]);
    downloadCsv(`crm-leads-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(h, body));
  }

  return (
    <CrmPageShell
      title="Заявки"
      description="Сначала выберите физлицо или юрлицо — после отправки формы откроется черновик сделки в нужном разделе."
      variant="xl"
      actions={
        <>
          <button type="button" onClick={() => setShowForm((v) => !v)} className={crmBtnSecondary}>
            {showForm ? "Скрыть форму" : "Новая заявка"}
          </button>
          <button
            type="button"
            disabled={!displayRows.length}
            onClick={exportCsv}
            className={crmBtnSecondary}
          >
            CSV
          </button>
        </>
      }
    >
      {msg ? <div className={`mb-6 ${crmErrorBanner}`}>{msg}</div> : null}

      {showForm ? (
        <section className={`${crmCardAccentSky} mb-8`}>
          <h2 className="font-header text-xs uppercase tracking-[0.2em] text-sky-300/85">
            Новая заявка → сразу в сделку
          </h2>
          <fieldset className="mt-4 space-y-3 border-0 p-0">
            <legend className={crmLabel}>Куда ведём клиента *</legend>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-soviet-cream/85">
                <input
                  type="radio"
                  name="seg"
                  checked={form.intended_segment === "retail"}
                  onChange={() => setForm((f) => ({ ...f, intended_segment: "retail" }))}
                  className="accent-soviet-red"
                />
                Физлицо (розница)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-soviet-cream/85">
                <input
                  type="radio"
                  name="seg"
                  checked={form.intended_segment === "b2b"}
                  onChange={() => setForm((f) => ({ ...f, intended_segment: "b2b" }))}
                  className="accent-violet-500"
                />
                Юрлицо (B2B)
              </label>
            </div>
          </fieldset>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className={crmLabel}>Менеджер (на сделке)</span>
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                className={`${crmSelect} max-w-md`}
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
              <span className={crmLabel}>
                {form.intended_segment === "b2b" ? "Контакт / ФИО *" : "Имя клиента *"}
              </span>
              <input
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                className={crmInput}
              />
            </label>
            {form.intended_segment === "b2b" ? (
              <label className="block space-y-1 sm:col-span-2">
                <span className={crmLabel}>Название компании</span>
                <input
                  value={form.company_name}
                  onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                  placeholder="Если пусто — подставим имя контакта"
                  className={crmInput}
                />
              </label>
            ) : null}
            <label className="block space-y-1">
              <span className={crmLabel}>Телефон</span>
              <input
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                className={crmInput}
              />
            </label>
            <label className="block space-y-1">
              <span className={crmLabel}>Email</span>
              <input
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                className={crmInput}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className={crmLabel}>Telegram</span>
              <input
                value={form.contact_telegram}
                onChange={(e) => setForm((f) => ({ ...f, contact_telegram: e.target.value }))}
                className={crmInput}
              />
            </label>
            {form.intended_segment === "retail" ? (
              <label className="block space-y-1 sm:col-span-2">
                <span className={crmLabel}>Компания (если есть)</span>
                <input
                  value={form.company_name}
                  onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                  className={crmInput}
                />
              </label>
            ) : null}
            <label className="block space-y-1">
              <span className={crmLabel}>Источник</span>
              <input
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="сайт, Telegram, партнёр…"
                className={crmInput}
              />
            </label>
            <label className="block space-y-1">
              <span className={crmLabel}>Кампания</span>
              <input
                value={form.campaign}
                onChange={(e) => setForm((f) => ({ ...f, campaign: e.target.value }))}
                className={crmInput}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className={crmLabel}>Сообщение / суть</span>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={3}
                className={crmTextarea}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void createLeadAndOpenDeal()}
            className={`${crmBtnPrimary} mt-4`}
          >
            {saving ? "…" : "Создать заявку и открыть сделку"}
          </button>
          <p className="mt-2 text-[11px] text-soviet-cream/45">
            Заявка сохранится со статусом «В сделку», черновик появится в журнале — уточните сумму и
            детали в карточке.
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <label className="block space-y-1">
          <span className={crmLabel}>Статус</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${crmSelect} w-auto min-w-[10rem]`}
          >
            <option value="all">Все</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {CRM_LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-soviet-cream/65">
          <input
            type="checkbox"
            checked={slaOnly}
            onChange={(e) => setSlaOnly(e.target.checked)}
            className="accent-amber-500"
          />
          Только «Новая» дольше 24 ч (эскалация)
        </label>
      </div>

      <div className={crmTableWrap}>
        {loading ? (
          <CrmTableSkeleton rows={7} cols={8} />
        ) : displayRows.length === 0 ? (
          <CrmEmptyState
            title={rows.length ? "Нет строк по фильтру" : "Заявок пока нет"}
            hint={
              rows.length
                ? "Снимите фильтр SLA или смените статус."
                : "Создайте первую заявку или смените фильтр по статусу."
            }
          >
            <button type="button" onClick={() => setShowForm(true)} className={crmBtnPrimary}>
              Новая заявка
            </button>
          </CrmEmptyState>
        ) : (
          <table className={`${crmTable} min-w-[900px]`}>
            <thead className={crmThead}>
              <tr>
                <th className={crmTh}>Дата</th>
                <th className={crmTh}>Тип</th>
                <th className={crmTh}>Статус</th>
                <th className={crmTh}>Менеджер</th>
                <th className={crmTh}>Контакт</th>
                <th className={crmTh}>Компания</th>
                <th className={crmTh}>Источник</th>
                <th className={crmTh} />
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r) => {
                const slaBad = r.status === "new" && isLeadNewOverSla(r.created_at);
                return (
                <tr
                  key={r.id}
                  className={`${crmTrEven} ${slaBad ? "border-l-2 border-amber-500/70 bg-amber-950/10" : ""}`}
                >
                  <td className={`${crmTd} whitespace-nowrap text-soviet-cream/62`}>
                    {new Date(r.created_at).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className={`${crmTd} text-[12px] text-soviet-cream/72`}>
                    {r.intended_segment
                      ? CRM_LEAD_INTENDED_LABELS[r.intended_segment] ?? r.intended_segment
                      : "—"}
                  </td>
                  <td className={crmTd}>
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-sky-200/88">
                      {CRM_LEAD_STATUS_LABELS[r.status] ?? r.status}
                      {slaBad ? (
                        <span className="ml-2 font-header text-[9px] uppercase tracking-wider text-amber-400/95">
                          SLA
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className={`${crmTd} max-w-[100px] truncate text-[12px] text-soviet-cream/58`}>
                    {r.assigned_to ? staffEmailMap.get(r.assigned_to) ?? "—" : "—"}
                  </td>
                  <td className={`${crmTd} font-medium text-soviet-cream/92`}>{r.contact_name}</td>
                  <td className={`${crmTd} text-soviet-cream/68`}>{r.company_name ?? "—"}</td>
                  <td className={`${crmTd} text-soviet-cream/58`}>{r.source ?? "—"}</td>
                  <td className={`${crmTd} text-right`}>
                    <Link
                      href={`/crm/leads/${r.id}`}
                      className="font-header text-[10px] uppercase tracking-wide text-tech-cyan/90 transition-colors duration-200 hover:text-tech-cyan hover:underline"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>
    </CrmPageShell>
  );
}

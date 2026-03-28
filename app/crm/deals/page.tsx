"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CrmClientCurrency,
  CrmPaymentMethod,
  CrmRetailDealOutcome,
} from "@/lib/crm/types";
import { logCrmAudit } from "@/lib/crm/audit";
import { downloadCsv, rowsToCsv } from "@/lib/crm/csv";
import {
  costInClientCurrency,
  marginFromClientAndCost,
  suggestedClientAmount,
  type FxRates,
} from "@/lib/crm/pricing";
import {
  crmBtnDanger,
  crmBtnSecondary,
  crmCard,
  crmErrorBanner,
  crmInput,
  crmLabel,
  crmSectionTitle,
  crmTable,
  crmTableWrap,
  crmTd,
  crmTh,
  crmThead,
  crmTrEven,
} from "@/lib/crm/crm-ui";
import { fetchCrmStaffOptions, staffEmailById, type CrmStaffOption } from "@/lib/crm/staff-directory";
import { canCloseDealSuccess } from "@/lib/crm/staff-access";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmEmptyState } from "../CrmEmptyState";
import { CrmPageShell } from "../CrmPageShell";
import { CrmTableSkeleton } from "../CrmSkeletons";
import { useCrmAccess } from "../CrmAccessProvider";

type ServiceOpt = {
  id: string;
  name: string;
  cost_usd: number;
  default_markup_percent: number;
};

type DealRow = {
  id: string;
  client_name: string;
  contact_telegram: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  service_id: string | null;
  custom_line_description: string | null;
  client_amount: number;
  client_currency: CrmClientCurrency;
  payment_method: CrmPaymentMethod;
  paid_at: string;
  margin_amount: number | null;
  margin_is_manual: boolean;
  deal_markup_percent?: number | null;
  deal_outcome?: CrmRetailDealOutcome | null;
  assigned_to?: string | null;
  crm_services: { name: string } | null;
};

const PAYMENT_LABELS: Record<CrmPaymentMethod, string> = {
  card: "Карта",
  bank_transfer: "Перевод",
  crypto: "Crypto",
  cash: "Наличные",
  other: "Другое",
};

const OUTCOME_LABELS: Record<CrmRetailDealOutcome, string> = {
  open: "В работе",
  success: "Успех",
  lost: "Отказ",
};

const emptyForm = () => ({
  client_name: "",
  contact_telegram: "",
  contact_email: "",
  contact_phone: "",
  service_id: "" as string,
  custom_line_description: "",
  deal_markup_percent: "" as string,
  client_amount: "" as string,
  client_currency: "RUB" as CrmClientCurrency,
  payment_method: "bank_transfer" as CrmPaymentMethod,
  paid_at: toLocalInput(new Date()),
  margin_amount: "" as string,
  margin_is_manual: false,
  deal_outcome: "open" as CrmRetailDealOutcome,
  assigned_to: "" as string,
});

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export default function CrmDealsPage() {
  const { staff } = useCrmAccess();
  const canConfirm = canCloseDealSuccess(staff);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | CrmRetailDealOutcome>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fx, setFx] = useState<FxRates | null>(null);
  const [staffOptions, setStaffOptions] = useState<CrmStaffOption[]>([]);

  const staffEmailMap = useMemo(() => staffEmailById(staffOptions), [staffOptions]);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    let q = supabase
      .from("crm_deals")
      .select("*, crm_services(name)")
      .order("paid_at", { ascending: false })
      .limit(300);

    if (dateFrom) {
      q = q.gte("paid_at", `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      q = q.lte("paid_at", `${dateTo}T23:59:59.999`);
    }
    if (search.trim()) {
      q = q.ilike("client_name", `%${search.trim()}%`);
    }
    if (outcomeFilter !== "all") {
      q = q.eq("deal_outcome", outcomeFilter);
    }

    const { data, error } = await q;
    if (error) {
      setMsg(error.message);
      setDeals([]);
    } else {
      setDeals((data ?? []) as DealRow[]);
    }
    setLoading(false);
  }, [dateFrom, dateTo, search, outcomeFilter]);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search).get("outcome");
    if (p === "open" || p === "success" || p === "lost") {
      setOutcomeFilter(p);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let c = false;
    (async () => {
      const supabase = supabaseBrowser();
      const [svcRes, fxRes, staffRes] = await Promise.all([
        supabase
          .from("crm_services")
          .select("id, name, cost_usd, default_markup_percent")
          .eq("is_active", true)
          .order("name"),
        supabase.from("crm_exchange_rates").select("uzs_per_usd, rub_per_usd").eq("id", 1).maybeSingle(),
        fetchCrmStaffOptions(supabase),
      ]);
      if (c) return;
      setServices((svcRes.data ?? []) as ServiceOpt[]);
      if (!staffRes.error) setStaffOptions(staffRes.options);
      if (fxRes.data) {
        setFx({
          uzsPerUsd: Number(fxRes.data.uzs_per_usd),
          rubPerUsd: Number(fxRes.data.rub_per_usd),
        });
      } else {
        setFx(null);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.id === form.service_id),
    [services, form.service_id]
  );

  const markupNum = useMemo(() => {
    const m = Number(String(form.deal_markup_percent).replace(",", "."));
    return Number.isFinite(m) ? m : null;
  }, [form.deal_markup_percent]);

  const clientAmountNum = useMemo(() => {
    const a = Number(String(form.client_amount).replace(",", "."));
    return Number.isFinite(a) ? a : null;
  }, [form.client_amount]);

  const costLocal = useMemo(() => {
    if (!selectedService || !fx) return null;
    const cUsd = Number(selectedService.cost_usd);
    if (!Number.isFinite(cUsd)) return null;
    return costInClientCurrency(cUsd, form.client_currency, fx);
  }, [selectedService, form.client_currency, fx]);

  const suggestedClient = useMemo(() => {
    if (!selectedService || !fx || markupNum == null) return null;
    const cUsd = Number(selectedService.cost_usd);
    if (!Number.isFinite(cUsd)) return null;
    return suggestedClientAmount(cUsd, markupNum, form.client_currency, fx);
  }, [selectedService, fx, markupNum, form.client_currency]);

  const autoMargin = useMemo(() => {
    if (!selectedService || !fx || clientAmountNum == null) return null;
    const cUsd = Number(selectedService.cost_usd);
    if (!Number.isFinite(cUsd)) return null;
    return marginFromClientAndCost(clientAmountNum, cUsd, form.client_currency, fx);
  }, [selectedService, fx, clientAmountNum, form.client_currency]);

  function startEdit(d: DealRow) {
    setEditingId(d.id);
    const svc = services.find((s) => s.id === (d.service_id ?? ""));
    const markupFromDeal =
      d.deal_markup_percent != null && Number.isFinite(Number(d.deal_markup_percent))
        ? String(d.deal_markup_percent)
        : svc
          ? String(svc.default_markup_percent)
          : "";
    setForm({
      client_name: d.client_name,
      contact_telegram: d.contact_telegram ?? "",
      contact_email: d.contact_email ?? "",
      contact_phone: d.contact_phone ?? "",
      service_id: d.service_id ?? "",
      custom_line_description: d.custom_line_description ?? "",
      deal_markup_percent: markupFromDeal,
      client_amount: String(d.client_amount),
      client_currency: d.client_currency,
      payment_method: d.payment_method,
      paid_at: toLocalInput(new Date(d.paid_at)),
      margin_amount: d.margin_amount != null ? String(d.margin_amount) : "",
      margin_is_manual: d.margin_is_manual,
      deal_outcome: (d.deal_outcome ?? "open") as CrmRetailDealOutcome,
      assigned_to: d.assigned_to ?? "",
    });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setMsg(null);
  }

  async function setDealOutcome(id: string, outcome: CrmRetailDealOutcome) {
    if ((outcome === "success" || outcome === "lost") && !canConfirm) {
      setMsg("Нет права ставить успех или отказ. Обратитесь к администратору.");
      return;
    }
    setMsg(null);
    const prev = (deals.find((d) => d.id === id)?.deal_outcome ?? "open") as CrmRetailDealOutcome;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("crm_deals").update({ deal_outcome: outcome }).eq("id", id);
    if (error) setMsg(error.message);
    else {
      setMsg("Статус обновлён.");
      if (prev !== outcome) {
        await logCrmAudit(supabase, {
          event_type: "retail_deal_outcome_changed",
          entity_table: "crm_deals",
          entity_id: id,
          summary: `Исход розницы: ${OUTCOME_LABELS[prev]} → ${OUTCOME_LABELS[outcome]}`,
          meta: { from: prev, to: outcome },
        });
      }
      await loadDeals();
    }
  }

  async function duplicateDeal(d: DealRow) {
    setMsg(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: full, error } = await supabase.from("crm_deals").select("*").eq("id", d.id).maybeSingle();
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
    insert.deal_outcome = "open";
    insert.paid_at = new Date().toISOString();
    insert.created_by = user?.id ?? null;
    const { error: insErr } = await supabase.from("crm_deals").insert(insert);
    if (insErr) setMsg(insErr.message);
    else {
      setMsg("Создана копия сделки (черновик, исход «В работе»).");
      await loadDeals();
      await logCrmAudit(supabase, {
        event_type: "retail_deal_duplicated",
        entity_table: "crm_deals",
        entity_id: d.id,
        summary: "Дублирование сделки физлица",
        meta: { source_deal_id: d.id },
      });
    }
  }

  function exportDealsCsv() {
    const headers = [
      "paid_at",
      "client_name",
      "line",
      "client_amount",
      "client_currency",
      "payment_method",
      "margin_amount",
      "deal_outcome",
      "manager",
    ];
    const rows = deals.map((d) => {
      const line = d.crm_services?.name ?? d.custom_line_description ?? "";
      const oc = (d.deal_outcome ?? "open") as CrmRetailDealOutcome;
      const mgr = d.assigned_to ? (staffEmailMap.get(d.assigned_to) ?? d.assigned_to) : "";
      return [
        d.paid_at,
        d.client_name,
        line,
        String(d.client_amount),
        d.client_currency,
        PAYMENT_LABELS[d.payment_method],
        d.margin_amount != null ? String(d.margin_amount) : "",
        OUTCOME_LABELS[oc],
        mgr,
      ];
    });
    downloadCsv(
      `crm-deals-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv(headers, rows)
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const amount = Number(String(form.client_amount).replace(",", "."));
    if (!form.client_name.trim() || !Number.isFinite(amount)) {
      setMsg("Укажите имя клиента и сумму.");
      setSaving(false);
      return;
    }

    if ((form.deal_outcome === "success" || form.deal_outcome === "lost") && !canConfirm) {
      setMsg("Нет права создавать или сохранять сделку сразу с исходом «Успех» или «Отказ».");
      setSaving(false);
      return;
    }

    const sid = form.service_id.trim();
    const custom = form.custom_line_description.trim();
    if (!sid && !custom) {
      setMsg("Выберите услугу из списка или опишите строку вручную.");
      setSaving(false);
      return;
    }

    const marginRaw = form.margin_amount.trim();
    const marginManualNum =
      marginRaw === "" ? null : Number(marginRaw.replace(",", "."));

    const finalMargin = form.margin_is_manual
      ? marginManualNum != null && Number.isFinite(marginManualNum)
        ? marginManualNum
        : null
      : autoMargin;

    const dealMarkupStored = sid && markupNum != null ? markupNum : null;

    const row = {
      client_name: form.client_name.trim(),
      contact_telegram: form.contact_telegram.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      service_id: sid || null,
      custom_line_description: sid ? null : custom,
      client_amount: amount,
      client_currency: form.client_currency,
      payment_method: form.payment_method,
      paid_at: fromLocalInput(form.paid_at),
      margin_amount: finalMargin,
      margin_is_manual: form.margin_is_manual,
      deal_markup_percent: dealMarkupStored,
      deal_outcome: form.deal_outcome,
      created_by: user?.id ?? null,
      assigned_to: form.assigned_to.trim() || null,
    };

    if (editingId) {
      const prevOutcome = (deals.find((x) => x.id === editingId)?.deal_outcome ??
        "open") as CrmRetailDealOutcome;
      const { error } = await supabase
        .from("crm_deals")
        .update({
          client_name: row.client_name,
          contact_telegram: row.contact_telegram,
          contact_email: row.contact_email,
          contact_phone: row.contact_phone,
          service_id: row.service_id,
          custom_line_description: row.custom_line_description,
          client_amount: row.client_amount,
          client_currency: row.client_currency,
          payment_method: row.payment_method,
          paid_at: row.paid_at,
          margin_amount: row.margin_amount,
          margin_is_manual: row.margin_is_manual,
          deal_markup_percent: row.deal_markup_percent,
          deal_outcome: row.deal_outcome,
          assigned_to: row.assigned_to,
        })
        .eq("id", editingId);
      if (error) setMsg(error.message);
      else {
        setMsg("Сделка обновлена.");
        if (prevOutcome !== row.deal_outcome) {
          await logCrmAudit(supabase, {
            event_type: "retail_deal_outcome_changed",
            entity_table: "crm_deals",
            entity_id: editingId,
            summary: `Исход розницы: ${OUTCOME_LABELS[prevOutcome]} → ${OUTCOME_LABELS[row.deal_outcome]}`,
            meta: { from: prevOutcome, to: row.deal_outcome },
          });
        }
        cancelEdit();
        await loadDeals();
      }
    } else {
      const { data: created, error } = await supabase.from("crm_deals").insert(row).select("id").single();
      if (error) setMsg(error.message);
      else {
        setMsg("Сделка создана.");
        if (row.deal_outcome !== "open" && created?.id) {
          await logCrmAudit(supabase, {
            event_type: "retail_deal_created_closed",
            entity_table: "crm_deals",
            entity_id: created.id as string,
            summary: `Новая сделка с исходом «${OUTCOME_LABELS[row.deal_outcome]}»`,
            meta: { deal_outcome: row.deal_outcome, client_name: row.client_name },
          });
        }
        setForm(emptyForm());
        await loadDeals();
      }
    }
    setSaving(false);
  }

  return (
    <CrmPageShell
      title="Сделки (физлица)"
      description="Журнал оплат: фильтр по дате и поиск по имени клиента. Редактирование — кнопка у строки."
      variant="wide"
    >
      <form onSubmit={(e) => void submit(e)} className={`mb-10 space-y-4 ${crmCard}`}>
        <h2 className={crmSectionTitle}>
          {editingId ? "Редактирование сделки" : "Новая сделка"}
        </h2>
        <p className="text-[12px] text-soviet-cream/50">
          Основное — на виду. Прайс, контакты, маржа и исход — в блоке «Дополнительно».
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className={crmLabel}>Клиент</span>
            <input
              required
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              className={crmInput}
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className={crmLabel}>Менеджер</span>
            <select
              value={form.assigned_to}
              onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
              className={`${crmInput} max-w-md`}
            >
              <option value="">Не назначен</option>
              {staffOptions.map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.email ?? s.user_id.slice(0, 8) + "…"}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={crmLabel}>Валюта оплаты</span>
            <select
              value={form.client_currency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  client_currency: e.target.value as CrmClientCurrency,
                }))
              }
              className={crmInput}
            >
              <option value="RUB">RUB</option>
              <option value="USD">USD</option>
              <option value="UZS">UZS</option>
            </select>
          </label>
          <div className="space-y-1">
            <span className="block text-[11px] uppercase text-soviet-cream/45">
              Сумма клиента
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                required
                inputMode="decimal"
                value={form.client_amount}
                onChange={(e) => setForm((f) => ({ ...f, client_amount: e.target.value }))}
                className={`${crmInput} min-w-0 flex-1`}
              />
              <button
                type="button"
                disabled={suggestedClient == null}
                onClick={() =>
                  suggestedClient != null &&
                  setForm((f) => ({ ...f, client_amount: String(suggestedClient) }))
                }
                className="shrink-0 rounded-lg border border-white/20 px-3 py-2 font-header text-[10px] uppercase tracking-wider text-soviet-cream/80 hover:bg-white/5 disabled:opacity-30"
              >
                Ориентир
              </button>
            </div>
          </div>
          <label className="block space-y-1">
            <span className={crmLabel}>Способ оплаты</span>
            <select
              value={form.payment_method}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  payment_method: e.target.value as CrmPaymentMethod,
                }))
              }
              className={crmInput}
            >
              {(Object.keys(PAYMENT_LABELS) as CrmPaymentMethod[]).map((k) => (
                <option key={k} value={k}>
                  {PAYMENT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={crmLabel}>Дата оплаты</span>
            <input
              type="datetime-local"
              value={form.paid_at}
              onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
              className={crmInput}
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className={crmLabel}>
              Что оплатили (кратко)
            </span>
            <input
              value={form.custom_line_description}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({
                  ...f,
                  custom_line_description: v,
                  service_id: v.trim() ? "" : f.service_id,
                }));
              }}
              placeholder="Например: ChatGPT Plus, перевод, подписка…"
              className={crmInput}
            />
            <span className="block text-[10px] text-soviet-cream/40">
              Либо укажите текст здесь, либо выберите позицию из прайса в «Дополнительно».
            </span>
          </label>
        </div>

        <details className="mt-4 rounded-xl border border-white/10 bg-zinc-950/35 p-4">
          <summary className="cursor-pointer font-header text-[11px] uppercase tracking-widest text-soviet-cream/55">
            Дополнительно — прайс, контакты, маржа, исход
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className={crmLabel}>Исход сделки</span>
              <select
                value={form.deal_outcome}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    deal_outcome: e.target.value as CrmRetailDealOutcome,
                  }))
                }
                className={`${crmInput} max-w-xs`}
              >
                {(Object.keys(OUTCOME_LABELS) as CrmRetailDealOutcome[]).map((k) => (
                  <option
                    key={k}
                    value={k}
                    disabled={!canConfirm && (k === "success" || k === "lost")}
                  >
                    {OUTCOME_LABELS[k]}
                  </option>
                ))}
              </select>
              <span className="block text-[10px] text-soviet-cream/40">
                «Успех» и «Отказ» — также кнопками в таблице.
                {!canConfirm ? " Без права закрытия доступен только «В работе»." : null}
              </span>
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className={crmLabel}>Услуга из прайса</span>
              <select
                value={form.service_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const s = services.find((x) => x.id === id);
                  setForm((f) => ({
                    ...f,
                    service_id: id,
                    deal_markup_percent: s ? String(s.default_markup_percent) : "",
                    custom_line_description: id ? "" : f.custom_line_description,
                  }));
                }}
                className={crmInput}
              >
                <option value="">— не из прайса —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className={crmLabel}>Telegram</span>
              <input
                value={form.contact_telegram}
                onChange={(e) => setForm((f) => ({ ...f, contact_telegram: e.target.value }))}
                className={crmInput}
              />
            </label>
            <label className="block space-y-1">
              <span className={crmLabel}>Email</span>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                className={crmInput}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className={crmLabel}>Телефон</span>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                className={crmInput}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className={crmLabel}>
                Наценка по сделке, %
              </span>
              <input
                type="number"
                step="0.1"
                disabled={!form.service_id}
                value={form.deal_markup_percent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, deal_markup_percent: e.target.value }))
                }
                className={`${crmInput} max-w-[200px] disabled:opacity-40`}
              />
              <span className="block text-[10px] text-soviet-cream/40">
                Только если выбрана услуга из прайса; влияет на ориентир суммы.
              </span>
            </label>
            {selectedService && fx ? (
              <div className="sm:col-span-2 space-y-1.5 rounded-lg border border-tech-cyan/20 bg-tech-cyan/5 px-3 py-3 text-[12px] text-soviet-cream/70">
                <p>
                  Себестоимость в валюте оплаты:{" "}
                  <strong className="text-soviet-cream">
                    {costLocal != null
                      ? costLocal.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
                      : "—"}{" "}
                    {form.client_currency}
                  </strong>{" "}
                  <span className="text-soviet-cream/45">
                    (USD {Number(selectedService.cost_usd).toLocaleString("ru-RU")} × курс)
                  </span>
                </p>
                {suggestedClient != null ? (
                  <p>
                    Ориентир суммы клиента:{" "}
                    <strong className="text-soviet-cream">
                      {suggestedClient.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}{" "}
                      {form.client_currency}
                    </strong>
                    <span className="text-soviet-cream/45"> = себестоимость × (1 + наценка%)</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-soviet-cream/70">
                <input
                  type="checkbox"
                  checked={form.margin_is_manual}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      margin_is_manual: e.target.checked,
                      margin_amount:
                        e.target.checked && autoMargin != null
                          ? String(autoMargin)
                          : f.margin_amount,
                    }))
                  }
                  className="accent-soviet-red"
                />
                Задать маржу вручную
              </label>
              {form.margin_is_manual ? (
                <label className="block space-y-1">
                  <span className={crmLabel}>Маржа</span>
                  <input
                    inputMode="decimal"
                    value={form.margin_amount}
                    onChange={(e) => setForm((f) => ({ ...f, margin_amount: e.target.value }))}
                    className={`${crmInput} max-w-xs`}
                  />
                </label>
              ) : (
                <div className="rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm">
                  <span className="text-soviet-cream/55">Маржа (авто): </span>
                  <strong className="text-emerald-300/95">
                    {autoMargin != null
                      ? `${autoMargin.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${form.client_currency}`
                      : selectedService && fx
                        ? "—"
                        : "выберите услугу из прайса и курсы в «Курсы»"}
                  </strong>
                  <p className="mt-1 text-[10px] text-soviet-cream/40 leading-relaxed">
                    Оплата минус себестоимость услуги в валюте клиента.
                  </p>
                </div>
              )}
            </div>
          </div>
        </details>
        {msg ? (
          <div
            className={
              msg.includes("Сделка") || msg.includes("Статус")
                ? "rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200/90"
                : crmErrorBanner
            }
          >
            {msg}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className={crmBtnDanger}>
            {saving ? "…" : editingId ? "Сохранить" : "Создать"}
          </button>
          {editingId ? (
            <button type="button" onClick={cancelEdit} className={crmBtnSecondary}>
              Отмена
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block space-y-1">
          <span className={crmLabel}>Оплата с</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={`${crmInput} w-auto min-w-[9rem]`}
          />
        </label>
        <label className="block space-y-1">
          <span className={crmLabel}>по</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={`${crmInput} w-auto min-w-[9rem]`}
          />
        </label>
        <label className="block min-w-[200px] flex-1 space-y-1">
          <span className={crmLabel}>Поиск по имени</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Имя клиента"
            className={crmInput}
          />
        </label>
        <label className="block space-y-1">
          <span className={crmLabel}>Исход</span>
          <select
            value={outcomeFilter}
            onChange={(e) =>
              setOutcomeFilter(e.target.value as "all" | CrmRetailDealOutcome)
            }
            className={`${crmInput} w-auto min-w-[9rem]`}
          >
            <option value="all">Все</option>
            {(Object.keys(OUTCOME_LABELS) as CrmRetailDealOutcome[]).map((k) => (
              <option key={k} value={k}>
                {OUTCOME_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={deals.length === 0}
          onClick={() => exportDealsCsv()}
          className={crmBtnSecondary}
        >
          CSV
        </button>
      </div>

      <div className={crmTableWrap}>
        {loading ? (
          <CrmTableSkeleton rows={8} cols={9} />
        ) : deals.length === 0 ? (
          <CrmEmptyState
            title="Пока нет сделок"
            hint="Создайте запись формой выше или снимите фильтры по дате и исходу."
          />
        ) : (
          <table className={`${crmTable} min-w-[820px]`}>
            <thead className={crmThead}>
              <tr>
                <th className={crmTh}>Дата</th>
                <th className={crmTh}>Клиент</th>
                <th className={crmTh}>Менеджер</th>
                <th className={crmTh}>Услуга / строка</th>
                <th className={crmTh}>Сумма</th>
                <th className={crmTh}>Оплата</th>
                <th className={crmTh}>Маржа</th>
                <th className={crmTh}>Исход</th>
                <th className={crmTh} />
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const line =
                  d.crm_services?.name ?? d.custom_line_description ?? "—";
                const oc = (d.deal_outcome ?? "open") as CrmRetailDealOutcome;
                return (
                  <tr key={d.id} className={crmTrEven}>
                    <td className={`${crmTd} whitespace-nowrap text-soviet-cream/72`}>
                      {new Date(d.paid_at).toLocaleString("ru-RU", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className={`${crmTd} font-medium`}>{d.client_name}</td>
                    <td
                      className={`${crmTd} max-w-[120px] truncate text-[12px] text-soviet-cream/62`}
                      title={d.assigned_to ? staffEmailMap.get(d.assigned_to) : ""}
                    >
                      {d.assigned_to
                        ? staffEmailMap.get(d.assigned_to) ?? "—"
                        : "—"}
                    </td>
                    <td className={`${crmTd} max-w-[200px] truncate text-soviet-cream/78`} title={line}>
                      {line}
                    </td>
                    <td className={`${crmTd} whitespace-nowrap font-mono tabular-nums`}>
                      {Number(d.client_amount).toLocaleString("ru-RU")} {d.client_currency}
                    </td>
                    <td className={`${crmTd} text-soviet-cream/68`}>
                      {PAYMENT_LABELS[d.payment_method]}
                    </td>
                    <td className={`${crmTd} font-mono tabular-nums text-soviet-cream/68`}>
                      {d.margin_amount != null
                        ? `${Number(d.margin_amount).toLocaleString("ru-RU")}${d.margin_is_manual ? " *" : ""}`
                        : "—"}
                    </td>
                    <td className={crmTd}>
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex w-fit rounded px-2 py-0.5 font-header text-[9px] uppercase tracking-wide ${
                            oc === "success"
                              ? "bg-emerald-500/20 text-emerald-200/90"
                              : oc === "lost"
                                ? "bg-zinc-600/30 text-zinc-400"
                                : "bg-amber-500/15 text-amber-200/85"
                          }`}
                        >
                          {OUTCOME_LABELS[oc]}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {oc !== "success" && canConfirm ? (
                            <button
                              type="button"
                              onClick={() => void setDealOutcome(d.id, "success")}
                              className="rounded border border-emerald-500/35 px-2 py-1 font-header text-[9px] uppercase tracking-wide text-emerald-200/90 hover:bg-emerald-500/10"
                            >
                              Успех
                            </button>
                          ) : null}
                          {oc !== "lost" && canConfirm ? (
                            <button
                              type="button"
                              onClick={() => void setDealOutcome(d.id, "lost")}
                              className="rounded border border-zinc-500/40 px-2 py-1 font-header text-[9px] uppercase tracking-wide text-zinc-400 hover:bg-white/5"
                            >
                              Отказ
                            </button>
                          ) : null}
                          {oc !== "open" ? (
                            <button
                              type="button"
                              onClick={() => void setDealOutcome(d.id, "open")}
                              className="rounded border border-white/15 px-2 py-1 font-header text-[9px] uppercase tracking-wide text-soviet-cream/55 hover:bg-white/5"
                            >
                              В работу
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={`${crmTd} space-y-1`}>
                      <button
                        type="button"
                        onClick={() => startEdit(d)}
                        className="block font-header text-[10px] uppercase tracking-wider text-tech-cyan hover:underline"
                      >
                        Правка
                      </button>
                      <button
                        type="button"
                        onClick={() => void duplicateDeal(d)}
                        className="block font-header text-[10px] uppercase tracking-wider text-soviet-cream/50 hover:text-soviet-cream/80"
                      >
                        Дубль
                      </button>
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

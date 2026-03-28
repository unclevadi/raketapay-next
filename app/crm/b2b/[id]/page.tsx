"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  marginPercentOfTransfer,
  marginUsdFromPercent,
  transferAmountToUsd,
  type B2bFxSnapshot,
} from "@/lib/crm/b2b-fx";
import { b2bStageGateMessage } from "@/lib/crm/b2b-stage-gates";
import { logCrmAudit } from "@/lib/crm/audit";
import { fetchCrmStaffOptions, type CrmStaffOption } from "@/lib/crm/staff-directory";
import { crmErrorBanner } from "@/lib/crm/crm-ui";
import { canCloseDealSuccess } from "@/lib/crm/staff-access";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmPageShell } from "../../CrmPageShell";
import { CrmPageHeaderSkeleton } from "../../CrmSkeletons";
import { useCrmAccess } from "../../CrmAccessProvider";
import { B2bDealDocumentsPanel } from "../B2bDealDocumentsPanel";
import { B2bDealSharePanel } from "../B2bDealSharePanel";
import { B2bDealTasksPanel } from "../B2bDealTasksPanel";
import { B2bDealTemplatesPanel } from "../B2bDealTemplatesPanel";
import { DealStageRail } from "../DealStageRail";

type Stage = { id: string; slug: string; label: string; sort_order: number };

type Deal = {
  id: string;
  company_legal_name: string;
  country_code: string;
  tax_id: string | null;
  counterparty_country: string | null;
  transfer_amount: number;
  transfer_currency: string;
  purpose_summary: string | null;
  stage_id: string;
  deal_tier: string;
  priority: number;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  internal_notes: string | null;
  compliance_notes: string | null;
  expected_margin_usd: number | null;
  target_close_date: string | null;
  assigned_to: string | null;
  created_at?: string;
  updated_at?: string;
};

const TIERS = [
  { value: "tier_s", label: "S" },
  { value: "tier_m", label: "M" },
  { value: "tier_l", label: "L" },
  { value: "tier_xl", label: "XL" },
] as const;

const CURRENCIES = ["USD", "EUR", "RUB", "UZS", "GBP", "OTHER"] as const;

const QUICK_FEE_PCTS = [0.8, 1, 1.25, 1.5, 2] as const;

function statusCardBorder(slug: string | undefined) {
  if (slug === "completed") return "border-emerald-500/55";
  if (slug === "rejected") return "border-zinc-600/55";
  return "border-violet-500/55";
}

function statusCardBg(slug: string | undefined) {
  if (slug === "completed") return "bg-emerald-950/45";
  if (slug === "rejected") return "bg-zinc-900/55";
  return "bg-violet-950/45";
}

export default function CrmB2bDealPage() {
  const { staff } = useCrmAccess();
  const canConfirm = canCloseDealSuccess(staff);
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [stages, setStages] = useState<Stage[]>([]);
  const [stagesLoadError, setStagesLoadError] = useState<string | null>(null);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [fx, setFx] = useState<B2bFxSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stageBusy, setStageBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [customPct, setCustomPct] = useState("");
  const [staffOptions, setStaffOptions] = useState<CrmStaffOption[]>([]);

  useEffect(() => {
    let c = false;
    void (async () => {
      const supabase = supabaseBrowser();
      const r = await fetchCrmStaffOptions(supabase);
      if (!c && !r.error) setStaffOptions(r.options);
    })();
    return () => {
      c = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMsg(null);
    setStagesLoadError(null);
    const supabase = supabaseBrowser();
    const [{ data: st, error: stErr }, { data: row, error }, { data: rateRow }] = await Promise.all([
      supabase.from("crm_b2b_pipeline_stages").select("id, slug, label, sort_order").order("sort_order"),
      supabase.from("crm_b2b_deals").select("*").eq("id", id).maybeSingle(),
      supabase.from("crm_exchange_rates").select("rub_per_usd, uzs_per_usd").eq("id", 1).maybeSingle(),
    ]);

    if (stErr) {
      setStagesLoadError(stErr.message);
      setStages([]);
    } else {
      let list = (st ?? []) as Stage[];
      if (row && !error && row.stage_id && !list.some((s) => s.id === String(row.stage_id))) {
        const { data: one } = await supabase
          .from("crm_b2b_pipeline_stages")
          .select("id, slug, label, sort_order")
          .eq("id", row.stage_id)
          .maybeSingle();
        if (one) {
          list = [...list, one as Stage].sort((a, b) => a.sort_order - b.sort_order);
        }
      }
      setStages(list);
    }
    if (rateRow) {
      setFx({
        rubPerUsd: Number(rateRow.rub_per_usd),
        uzsPerUsd: Number(rateRow.uzs_per_usd),
      });
    } else {
      setFx(null);
    }
    if (error) {
      setMsg(error.message);
      setDeal(null);
    } else if (!row) {
      setMsg("Сделка не найдена");
      setDeal(null);
    } else {
      const r = row as Record<string, unknown>;
      setDeal({
        ...(row as Deal),
        assigned_to: (r.assigned_to as string | null | undefined) ?? null,
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const usdEquiv = useMemo(() => {
    if (!deal) return null;
    return transferAmountToUsd(deal.transfer_amount, deal.transfer_currency, fx);
  }, [deal, fx]);

  const marginPctDisplay = useMemo(() => {
    if (!deal || !usdEquiv?.ok) return null;
    if (deal.expected_margin_usd == null) return null;
    return marginPercentOfTransfer(deal.expected_margin_usd, usdEquiv.usd);
  }, [deal, usdEquiv]);

  const completedStageId = useMemo(
    () => stages.find((s) => s.slug === "completed")?.id,
    [stages]
  );
  const rejectedStageId = useMemo(
    () => stages.find((s) => s.slug === "rejected")?.id,
    [stages]
  );
  const inquiryStageId = useMemo(
    () => stages.find((s) => s.slug === "inquiry")?.id,
    [stages]
  );

  const persistStage = useCallback(
    async (stageId: string) => {
      if (!deal) return;
      const newMeta = stages.find((s) => s.id === stageId);
      const oldMeta = stages.find((s) => s.id === deal.stage_id);
      const gateMsg = b2bStageGateMessage(
        {
          company_legal_name: deal.company_legal_name,
          country_code: deal.country_code,
          transfer_amount: deal.transfer_amount,
          tax_id: deal.tax_id,
          contact_name: deal.contact_name,
          contact_email: deal.contact_email,
          purpose_summary: deal.purpose_summary,
          expected_margin_usd: deal.expected_margin_usd,
        },
        newMeta?.slug ?? ""
      );
      if (gateMsg) {
        setMsg(gateMsg);
        return;
      }
      const isTerminal = (s: { slug: string } | undefined) =>
        s?.slug === "completed" || s?.slug === "rejected";
      if (isTerminal(newMeta) && !canConfirm) {
        setMsg("Нет права переводить сделку в успех или отказ.");
        return;
      }
      const dealId = deal.id;
      const prevStage = deal.stage_id;
      setDeal((d) => (d ? { ...d, stage_id: stageId } : null));
      setStageBusy(true);
      setMsg(null);
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("crm_b2b_deals")
        .update({ stage_id: stageId })
        .eq("id", dealId);
      setStageBusy(false);
      if (error) {
        setMsg(error.message);
        setDeal((d) => (d ? { ...d, stage_id: prevStage } : null));
        return;
      }
      setMsg("Этап сохранён.");
      if (oldMeta?.id !== newMeta?.id) {
        await logCrmAudit(supabase, {
          event_type: "b2b_stage_changed",
          entity_table: "crm_b2b_deals",
          entity_id: dealId,
          summary: `B2B этап: ${oldMeta?.label ?? "?"} → ${newMeta?.label ?? "?"}`,
          meta: { from_slug: oldMeta?.slug, to_slug: newMeta?.slug },
        });
        void fetch("/api/crm/notify/b2b-stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            dealId,
            fromSlug: oldMeta?.slug ?? null,
            toSlug: newMeta?.slug ?? null,
          }),
        });
      }
    },
    [deal, stages, canConfirm]
  );

  function applyFeePercent(pct: number) {
    if (!deal || !usdEquiv?.ok) return;
    const m = marginUsdFromPercent(usdEquiv.usd, pct);
    if (m == null) return;
    setDeal({ ...deal, expected_margin_usd: m });
    setMsg(null);
  }

  function applyCustomPercent() {
    const p = Number(customPct.replace(",", "."));
    if (!Number.isFinite(p) || p < 0) return;
    applyFeePercent(p);
    setCustomPct("");
  }

  async function save() {
    if (!deal) return;
    setSaving(true);
    setMsg(null);
    const amt = Number(String(deal.transfer_amount).replace(",", "."));
    if (!deal.company_legal_name.trim() || deal.country_code.trim().length !== 2) {
      setMsg("Проверьте название и код страны (2 буквы).");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setMsg("Сумма должна быть положительным числом.");
      setSaving(false);
      return;
    }
    const supabase = supabaseBrowser();
    const marginRaw = deal.expected_margin_usd;
    const { error } = await supabase
      .from("crm_b2b_deals")
      .update({
        company_legal_name: deal.company_legal_name.trim(),
        country_code: deal.country_code.trim().toUpperCase(),
        tax_id: deal.tax_id?.trim() || null,
        counterparty_country: deal.counterparty_country?.trim() || null,
        transfer_amount: amt,
        transfer_currency: deal.transfer_currency,
        purpose_summary: deal.purpose_summary?.trim() || null,
        stage_id: deal.stage_id,
        deal_tier: deal.deal_tier,
        priority: Math.min(4, Math.max(1, deal.priority)),
        contact_name: deal.contact_name?.trim() || null,
        contact_email: deal.contact_email?.trim() || null,
        contact_phone: deal.contact_phone?.trim() || null,
        internal_notes: deal.internal_notes?.trim() || null,
        compliance_notes: deal.compliance_notes?.trim() || null,
        expected_margin_usd:
          marginRaw !== null && marginRaw !== undefined && Number.isFinite(Number(marginRaw))
            ? Number(marginRaw)
            : null,
        target_close_date: deal.target_close_date || null,
        assigned_to: deal.assigned_to || null,
      })
      .eq("id", deal.id);

    if (error) setMsg(error.message);
    else setMsg("Сохранено.");
    setSaving(false);
  }

  async function removeDeal() {
    if (!deal || !confirm("Удалить сделку?")) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("crm_b2b_deals").delete().eq("id", deal.id);
    if (error) setMsg(error.message);
    else router.push("/crm/b2b");
  }

  if (loading) {
    return (
      <CrmPageShell title="B2B" variant="md">
        <CrmPageHeaderSkeleton />
      </CrmPageShell>
    );
  }

  if (!deal) {
    return (
      <CrmPageShell
        title="B2B"
        variant="md"
        prepend={
          <Link
            href="/crm/b2b"
            className="text-[11px] uppercase tracking-widest text-tech-cyan/88 transition-colors duration-200 hover:text-tech-cyan"
          >
            ← Список B2B
          </Link>
        }
      >
        <div className={crmErrorBanner}>{msg ?? "Ошибка"}</div>
      </CrmPageShell>
    );
  }

  const currentStageMeta = stages.find((s) => s.id === deal.stage_id);
  const tierLabel = TIERS.find((t) => t.value === deal.deal_tier)?.label ?? deal.deal_tier;
  const stageBroken =
    Boolean(deal.stage_id) &&
    !currentStageMeta &&
    !stagesLoadError &&
    stages.length > 0;

  let closeDateHint: null | "overdue" | "soon" = null;
  if (deal.target_close_date && currentStageMeta) {
    const sl = currentStageMeta.slug;
    if (sl !== "completed" && sl !== "rejected") {
      const t = new Date(`${deal.target_close_date.slice(0, 10)}T12:00:00`).getTime();
      const days = (t - Date.now()) / 86400000;
      if (days < 0) closeDateHint = "overdue";
      else if (days <= 7) closeDateHint = "soon";
    }
  }

  return (
    <CrmPageShell
      title={deal.company_legal_name}
      titleClassName="font-header text-2xl font-black uppercase italic tracking-tight text-violet-200/95 sm:text-[1.65rem]"
      variant="md"
      prepend={
        <Link
          href="/crm/b2b"
          className="text-[11px] uppercase tracking-widest text-tech-cyan/88 transition-colors duration-200 hover:text-tech-cyan"
        >
          ← Список B2B
        </Link>
      }
    >
      <div
        className={`mt-5 rounded-2xl border-2 px-4 py-4 ${statusCardBorder(currentStageMeta?.slug)} ${statusCardBg(currentStageMeta?.slug)}`}
      >
        <p className="font-header text-[10px] uppercase tracking-[0.22em] text-soviet-cream/50">
          Статус сделки · этап воронки
        </p>

        {stagesLoadError ? (
          <p className="mt-3 text-sm leading-relaxed text-red-300/90">
            Не удалось загрузить справочник этапов: {stagesLoadError}
          </p>
        ) : stages.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-amber-200/85">
            В базе нет строк в{" "}
            <code className="text-tech-cyan/80">crm_b2b_pipeline_stages</code> — выполните сиды из
            миграции CRM (B2B).
          </p>
        ) : stageBroken ? (
          <div className="mt-3 space-y-2 text-sm text-amber-200/90">
            <p>
              У сделки указан <code className="text-tech-cyan/80">stage_id</code>, которого нет в
              справочнике (часто после пересоздания этапов в другой базе).
            </p>
            <p className="font-mono text-[11px] text-soviet-cream/55 break-all">{deal.stage_id}</p>
            <p className="text-soviet-cream/70">
              Выберите актуальный этап в блоке «Сменить этап» ниже — он сохранится в БД.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 font-header text-lg font-bold leading-snug text-soviet-cream">
              {currentStageMeta?.label ?? "—"}
            </p>
            {currentStageMeta?.slug ? (
              <p className="mt-1.5 font-mono text-[11px] text-soviet-cream/50">
                Код в системе: {currentStageMeta.slug}
              </p>
            ) : null}
          </>
        )}
      </div>

      <p className="mt-3 text-[12px] text-soviet-cream/55">
        Уровень сделки: <span className="text-soviet-cream/80">{tierLabel}</span>
        {" · "}
        Приоритет: <span className="text-soviet-cream/80">{deal.priority}</span>
      </p>

      {closeDateHint === "overdue" ? (
        <div className="mt-3 rounded-lg border border-red-500/35 bg-red-950/25 px-3 py-2 text-sm text-red-200/90">
          Целевая дата закрытия уже прошла — проверьте этап или обновите дату в карточке.
        </div>
      ) : closeDateHint === "soon" ? (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-200/88">
          До целевой даты закрытия осталось меньше недели.
        </div>
      ) : null}

      {msg ? (
        <p
          className={`mt-3 text-sm ${msg === "Сохранено." || msg === "Этап сохранён." ? "text-emerald-400/90" : "text-red-400/90"}`}
        >
          {msg}
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        <DealStageRail
          stages={stages}
          currentId={deal.stage_id}
          busy={stageBusy}
          onSelectStage={(sid) => void persistStage(sid)}
        />

        <div className="flex flex-wrap gap-2">
          {completedStageId && deal.stage_id !== completedStageId && canConfirm ? (
            <button
              type="button"
              disabled={stageBusy}
              onClick={() => void persistStage(completedStageId)}
              className="rounded-lg border border-emerald-500/45 bg-emerald-950/30 px-4 py-2 font-header text-[10px] uppercase tracking-widest text-emerald-200/90 hover:bg-emerald-900/35 disabled:opacity-40"
            >
              Закрыть успехом
            </button>
          ) : null}
          {rejectedStageId && deal.stage_id !== rejectedStageId && canConfirm ? (
            <button
              type="button"
              disabled={stageBusy}
              onClick={() => void persistStage(rejectedStageId)}
              className="rounded-lg border border-zinc-500/45 bg-zinc-900/40 px-4 py-2 font-header text-[10px] uppercase tracking-widest text-zinc-400 hover:bg-zinc-800/50 disabled:opacity-40"
            >
              Отказ
            </button>
          ) : null}
          {inquiryStageId &&
          deal.stage_id !== inquiryStageId &&
          (deal.stage_id === completedStageId || deal.stage_id === rejectedStageId) ? (
            <button
              type="button"
              disabled={stageBusy}
              onClick={() => void persistStage(inquiryStageId)}
              className="rounded-lg border border-white/20 px-4 py-2 font-header text-[10px] uppercase tracking-widest text-soviet-cream/70 hover:bg-white/5 disabled:opacity-40"
            >
              Вернуть в «Запрос / лид»
            </button>
          ) : null}
        </div>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
          <h2 className="font-header text-[10px] uppercase tracking-[0.2em] text-soviet-cream/45">
            Сумма и маржа
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-zinc-950/50 p-3 text-[13px]">
              <div className="text-[10px] uppercase text-soviet-cream/40">Сделка</div>
              <div className="mt-1 font-medium text-soviet-cream/90">
                {Number(deal.transfer_amount).toLocaleString("ru-RU")} {deal.transfer_currency}
              </div>
              {usdEquiv?.ok ? (
                <p className="mt-2 text-[12px] text-emerald-200/80">
                  ≈ {usdEquiv.usd.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} USD
                  <span className="block text-[11px] text-soviet-cream/45">
                    по курсам CRM: 1 USD = {fx?.rubPerUsd.toLocaleString("ru-RU")} RUB,{" "}
                    {fx?.uzsPerUsd.toLocaleString("ru-RU")} UZS
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-amber-200/75">
                  {usdEquiv?.reason === "unsupported_currency"
                    ? "Для EUR / GBP / OTHER эквивалент в USD в CRM не считается — маржу в USD вводите вручную или укажите сумму в USD / RUB / UZS."
                    : usdEquiv?.reason === "no_fx"
                      ? "Курсы в CRM не загрузились (проверьте доступ к разделу «Курсы» и миграцию)."
                      : "Укажите положительную сумму для оценки в USD."}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/50 p-3 text-[13px]">
              <div className="text-[10px] uppercase text-soviet-cream/40">Ожидаемая маржа</div>
              <div className="mt-1 font-medium text-violet-200/95">
                {deal.expected_margin_usd != null
                  ? `${deal.expected_margin_usd.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} USD`
                  : "—"}
              </div>
              {marginPctDisplay != null ? (
                <p className="mt-2 text-[12px] text-soviet-cream/60">
                  ≈ {marginPctDisplay.toLocaleString("ru-RU", { maximumFractionDigits: 3 })}% от суммы в
                  USD
                </p>
              ) : usdEquiv?.ok ? (
                <p className="mt-2 text-[12px] text-soviet-cream/45">
                  Заполните маржу в USD или задайте ставку ниже.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-soviet-cream/40">
              Быстрая ставка (как % от экв. USD)
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {QUICK_FEE_PCTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={!usdEquiv?.ok}
                  onClick={() => applyFeePercent(p)}
                  className="rounded-lg border border-violet-500/30 bg-violet-950/30 px-2.5 py-1.5 font-mono text-[11px] text-violet-200/90 hover:bg-violet-900/40 disabled:opacity-35"
                >
                  {p}%
                </button>
              ))}
              <span className="text-soviet-cream/35">|</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="%"
                value={customPct}
                onChange={(e) => setCustomPct(e.target.value)}
                className="w-16 rounded-lg border border-white/15 bg-zinc-950 px-2 py-1.5 text-center text-[12px]"
              />
              <button
                type="button"
                disabled={!usdEquiv?.ok}
                onClick={() => applyCustomPercent()}
                className="rounded-lg border border-white/20 px-2.5 py-1.5 font-header text-[10px] uppercase tracking-widest text-soviet-cream/75 hover:bg-white/5 disabled:opacity-35"
              >
                OK
              </button>
            </div>
            <p className="mt-2 text-[11px] text-soviet-cream/40">
              Кнопки пересчитывают только поле «Ожидаемая маржа, USD» в форме — сохраните карточку, чтобы
              записать в БД.
            </p>
          </div>
        </section>

        <B2bDealTasksPanel dealId={deal.id} />

        <B2bDealDocumentsPanel
          dealId={deal.id}
          deal={{
            id: deal.id,
            company_legal_name: deal.company_legal_name,
            transfer_amount: deal.transfer_amount,
            transfer_currency: deal.transfer_currency,
            stage_id: deal.stage_id,
            created_at: deal.created_at ?? null,
            updated_at: deal.updated_at ?? null,
          }}
          stageLabel={currentStageMeta?.label ?? null}
        />

        <B2bDealTemplatesPanel
          dealId={deal.id}
          dealRecord={deal as unknown as Record<string, unknown>}
          stageLabel={currentStageMeta?.label ?? null}
        />

        <B2bDealSharePanel dealId={deal.id} />
      </div>

      <h2 className="mt-10 font-header text-xs uppercase tracking-[0.2em] text-soviet-cream/45">
        Карточка
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[10px] uppercase text-soviet-cream/45">Менеджер</span>
          <select
            value={deal.assigned_to ?? ""}
            onChange={(e) =>
              setDeal({
                ...deal,
                assigned_to: e.target.value ? e.target.value : null,
              })
            }
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
          <span className="text-[10px] uppercase text-soviet-cream/45">Компания</span>
          <input
            value={deal.company_legal_name}
            onChange={(e) => setDeal({ ...deal, company_legal_name: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">Страна (ISO2)</span>
          <input
            value={deal.country_code}
            onChange={(e) => setDeal({ ...deal, country_code: e.target.value })}
            maxLength={2}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">ИНН / tax id</span>
          <input
            value={deal.tax_id ?? ""}
            onChange={(e) => setDeal({ ...deal, tax_id: e.target.value || null })}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[10px] uppercase text-soviet-cream/45">Страна контрагента (текст)</span>
          <input
            value={deal.counterparty_country ?? ""}
            onChange={(e) =>
              setDeal({ ...deal, counterparty_country: e.target.value || null })
            }
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">Сумма перевода</span>
          <input
            type="text"
            inputMode="decimal"
            value={String(deal.transfer_amount)}
            onChange={(e) => {
              const v = e.target.value.replace(",", ".");
              if (v === "") {
                setDeal({ ...deal, transfer_amount: 0 });
                return;
              }
              const n = Number(v);
              if (Number.isFinite(n)) setDeal({ ...deal, transfer_amount: n });
            }}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">Валюта</span>
          <select
            value={deal.transfer_currency}
            onChange={(e) => setDeal({ ...deal, transfer_currency: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[10px] uppercase text-soviet-cream/45">Назначение</span>
          <input
            value={deal.purpose_summary ?? ""}
            onChange={(e) => setDeal({ ...deal, purpose_summary: e.target.value || null })}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">Стадия</span>
          <select
            value={deal.stage_id}
            onChange={(e) => void persistStage(e.target.value)}
            disabled={stageBusy}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm disabled:opacity-50"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">Уровень</span>
          <select
            value={deal.deal_tier}
            onChange={(e) => setDeal({ ...deal, deal_tier: e.target.value })}
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
            type="number"
            min={1}
            max={4}
            value={deal.priority}
            onChange={(e) =>
              setDeal({ ...deal, priority: Number(e.target.value) || 1 })
            }
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">Ожидаемая маржа, USD</span>
          <input
            type="text"
            inputMode="decimal"
            value={deal.expected_margin_usd ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v === "") {
                setDeal({ ...deal, expected_margin_usd: null });
                return;
              }
              const n = Number(v.replace(",", "."));
              setDeal({
                ...deal,
                expected_margin_usd: Number.isFinite(n) ? n : deal.expected_margin_usd,
              });
            }}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">Целевая дата закрытия</span>
          <input
            type="date"
            value={deal.target_close_date?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setDeal({
                ...deal,
                target_close_date: e.target.value ? e.target.value : null,
              })
            }
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">Контакт, ФИО</span>
          <input
            value={deal.contact_name ?? ""}
            onChange={(e) => setDeal({ ...deal, contact_name: e.target.value || null })}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-soviet-cream/45">Email</span>
          <input
            value={deal.contact_email ?? ""}
            onChange={(e) => setDeal({ ...deal, contact_email: e.target.value || null })}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[10px] uppercase text-soviet-cream/45">Телефон</span>
          <input
            value={deal.contact_phone ?? ""}
            onChange={(e) => setDeal({ ...deal, contact_phone: e.target.value || null })}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[10px] uppercase text-soviet-cream/45">Внутренние заметки</span>
          <textarea
            value={deal.internal_notes ?? ""}
            onChange={(e) => setDeal({ ...deal, internal_notes: e.target.value || null })}
            rows={3}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[10px] uppercase text-soviet-cream/45">Комплаенс</span>
          <textarea
            value={deal.compliance_notes ?? ""}
            onChange={(e) => setDeal({ ...deal, compliance_notes: e.target.value || null })}
            rows={3}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-violet-600 px-4 py-2.5 font-header text-[11px] uppercase tracking-widest text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить карточку"}
        </button>
        <button
          type="button"
          onClick={() => void removeDeal()}
          className="rounded-lg border border-red-500/40 px-4 py-2.5 font-header text-[11px] uppercase tracking-widest text-red-400/90 hover:bg-red-950/40"
        >
          Удалить
        </button>
      </div>
    </CrmPageShell>
  );
}

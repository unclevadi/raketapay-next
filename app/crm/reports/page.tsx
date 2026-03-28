"use client";

import { useCallback, useMemo, useState } from "react";
import type { B2bFxSnapshot } from "@/lib/crm/b2b-fx";
import {
  aggregateB2bDeals,
  aggregateRetailDeals,
  b2bBreakdownByCurrency,
  retailBreakdownByCurrency,
  type B2bDealRow,
  type RetailDealRow,
} from "@/lib/crm/reports";
import { downloadCsv, rowsToCsv } from "@/lib/crm/csv";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmPageShell } from "../CrmPageShell";
import { CrmPageHeaderSkeleton } from "../CrmSkeletons";
import { useCrmAccess } from "../CrmAccessProvider";

function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatRuDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type ReportSnapshot = {
  fx: B2bFxSnapshot;
  retailRows: RetailDealRow[];
  b2bRows: B2bDealRow[];
  includedRetail: boolean;
  includedB2b: boolean;
  from: string;
  to: string;
  generatedAt: string;
  retailSuccessOnly: boolean;
  b2bPeriodMode: "created" | "closed_success";
};

export default function CrmReportsPage() {
  const { staff, loading: accessLoading } = useCrmAccess();
  const canRetail = Boolean(staff?.can_access_retail);
  const canB2b = Boolean(staff?.can_access_b2b || staff?.is_admin);
  const bothSegments = canRetail && canB2b;

  const [from, setFrom] = useState(monthStartStr);
  const [to, setTo] = useState(todayStr);
  const [includeRetail, setIncludeRetail] = useState(true);
  const [includeB2b, setIncludeB2b] = useState(true);
  const [retailSuccessOnly, setRetailSuccessOnly] = useState(false);
  const [b2bPeriodMode, setB2bPeriodMode] = useState<"created" | "closed_success">("created");
  const [showCurrencyBreakdown, setShowCurrencyBreakdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);

  const applyPreset = useCallback((key: "month" | "prev_month" | "7d" | "30d") => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toYmd = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (key === "month") {
      setFrom(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setTo(toYmd(now));
      return;
    }
    if (key === "prev_month") {
      const firstThis = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastPrev = new Date(firstThis.getTime() - 86400000);
      const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
      setFrom(toYmd(firstPrev));
      setTo(toYmd(lastPrev));
      return;
    }
    if (key === "7d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      setFrom(toYmd(start));
      setTo(toYmd(now));
      return;
    }
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    setFrom(toYmd(start));
    setTo(toYmd(now));
  }, []);

  const runReport = useCallback(async () => {
    setErr(null);
    if (from > to) {
      setErr("Дата «С» не может быть позже «По».");
      return;
    }

    const wantRetail = canRetail && (!bothSegments || includeRetail);
    const wantB2b = canB2b && (!bothSegments || includeB2b);
    if (bothSegments && !includeRetail && !includeB2b) {
      setErr("Отметьте хотя бы один тип: физлица или юрлица.");
      return;
    }

    setLoading(true);
    const supabase = supabaseBrowser();

    const { data: rateRow, error: fxErr } = await supabase
      .from("crm_exchange_rates")
      .select("rub_per_usd, uzs_per_usd")
      .eq("id", 1)
      .maybeSingle();

    if (fxErr) {
      setErr(fxErr.message);
      setLoading(false);
      return;
    }

    const snap: B2bFxSnapshot | null = rateRow
      ? {
          rubPerUsd: Number(rateRow.rub_per_usd),
          uzsPerUsd: Number(rateRow.uzs_per_usd),
        }
      : null;

    if (!snap || snap.rubPerUsd <= 0 || snap.uzsPerUsd <= 0) {
      setErr("Нет корректных курсов в CRM (раздел «Курсы»).");
      setLoading(false);
      return;
    }

    const fromTs = `${from}T00:00:00`;
    const toTs = `${to}T23:59:59.999`;
    let retailRows: RetailDealRow[] = [];
    let b2bRows: B2bDealRow[] = [];

    try {
      if (wantRetail) {
        let rq = supabase
          .from("crm_deals")
          .select("client_name, client_amount, client_currency, margin_amount")
          .gte("paid_at", fromTs)
          .lte("paid_at", toTs)
          .limit(8000);
        if (retailSuccessOnly) rq = rq.eq("deal_outcome", "success");
        const { data, error } = await rq;
        if (error) throw new Error(`Розница: ${error.message}`);
        retailRows = (data ?? []) as RetailDealRow[];
      }
      if (wantB2b) {
        if (b2bPeriodMode === "closed_success") {
          const { data: stRow, error: stErr } = await supabase
            .from("crm_b2b_pipeline_stages")
            .select("id")
            .eq("slug", "completed")
            .maybeSingle();
          if (stErr) throw new Error(`B2B этапы: ${stErr.message}`);
          if (!stRow?.id) throw new Error("В справочнике нет этапа «completed».");
          const { data, error } = await supabase
            .from("crm_b2b_deals")
            .select("company_legal_name, transfer_amount, transfer_currency, expected_margin_usd")
            .eq("stage_id", stRow.id)
            .gte("updated_at", fromTs)
            .lte("updated_at", toTs)
            .limit(8000);
          if (error) throw new Error(`B2B: ${error.message}`);
          b2bRows = (data ?? []) as B2bDealRow[];
        } else {
          const { data, error } = await supabase
            .from("crm_b2b_deals")
            .select("company_legal_name, transfer_amount, transfer_currency, expected_margin_usd")
            .gte("created_at", fromTs)
            .lte("created_at", toTs)
            .limit(8000);
          if (error) throw new Error(`B2B: ${error.message}`);
          b2bRows = (data ?? []) as B2bDealRow[];
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      setLoading(false);
      return;
    }

    setSnapshot({
      fx: snap,
      retailRows,
      b2bRows,
      includedRetail: wantRetail,
      includedB2b: wantB2b,
      from,
      to,
      generatedAt: new Date().toISOString(),
      retailSuccessOnly,
      b2bPeriodMode,
    });
    setLoading(false);
  }, [
    from,
    to,
    canRetail,
    canB2b,
    bothSegments,
    includeRetail,
    includeB2b,
    retailSuccessOnly,
    b2bPeriodMode,
  ]);

  const retailAgg = useMemo(() => {
    if (!snapshot?.includedRetail) return null;
    return aggregateRetailDeals(snapshot.retailRows, snapshot.fx);
  }, [snapshot]);

  const b2bAgg = useMemo(() => {
    if (!snapshot?.includedB2b) return null;
    return aggregateB2bDeals(snapshot.b2bRows, snapshot.fx);
  }, [snapshot]);

  const retailByCur = useMemo(() => {
    if (!snapshot?.includedRetail || !showCurrencyBreakdown) return null;
    return retailBreakdownByCurrency(snapshot.retailRows, snapshot.fx);
  }, [snapshot, showCurrencyBreakdown]);

  const b2bByCur = useMemo(() => {
    if (!snapshot?.includedB2b || !showCurrencyBreakdown) return null;
    return b2bBreakdownByCurrency(snapshot.b2bRows, snapshot.fx);
  }, [snapshot, showCurrencyBreakdown]);

  function exportSnapshotCsv() {
    if (!snapshot) return;
    const lines: string[][] = [
      ["period_from", snapshot.from],
      ["period_to", snapshot.to],
      ["retail_included", String(snapshot.includedRetail)],
      ["retail_success_only", String(snapshot.retailSuccessOnly)],
      ["b2b_included", String(snapshot.includedB2b)],
      ["b2b_period_mode", snapshot.b2bPeriodMode],
    ];
    if (snapshot.includedRetail && retailAgg) {
      lines.push(
        ["retail_unique_clients", String(retailAgg.uniqueClients)],
        ["retail_deals", String(retailAgg.dealCount)],
        ["retail_turnover_usd", String(retailAgg.turnoverUsd)],
        ["retail_margin_usd", String(retailAgg.marginUsd)]
      );
    }
    if (snapshot.includedB2b && b2bAgg) {
      lines.push(
        ["b2b_unique_companies", String(b2bAgg.uniqueClients)],
        ["b2b_deals", String(b2bAgg.dealCount)],
        ["b2b_turnover_usd", String(b2bAgg.turnoverUsd)],
        ["b2b_margin_usd", String(b2bAgg.marginUsd)]
      );
    }
    downloadCsv(
      `crm-report-${snapshot.from}_${snapshot.to}.csv`,
      rowsToCsv(["metric", "value"], lines)
    );
  }

  if (accessLoading) {
    return (
      <CrmPageShell title="Отчёты" variant="lg">
        <CrmPageHeaderSkeleton />
      </CrmPageShell>
    );
  }

  if (!canRetail && !canB2b) {
    return (
      <CrmPageShell title="Отчёты" description="Нет доступа к разделам для отчётов." variant="lg" />
    );
  }

  return (
    <CrmPageShell
      title="Отчёты"
      description={
        <>
          <p className="max-w-xl text-[14px] leading-relaxed text-soviet-cream/58">
            Сначала укажите период и при необходимости типы — затем нажмите{" "}
            <span className="text-soviet-cream/82">«Сформировать отчёт»</span>. Оборот и маржа в USD по
            курсам из «Курсы».
          </p>
          <dl className="space-y-1 text-[12px] text-soviet-cream/42">
            <div>
              <dt className="inline text-soviet-cream/52">Розница:</dt>{" "}
              <dd className="inline">дата оплаты (paid_at); опционально только успешные (deal_outcome).</dd>
            </div>
            <div>
              <dt className="inline text-soviet-cream/52">Юрлица:</dt>{" "}
              <dd className="inline">
                по умолчанию created_at; либо закрытые успехом за период по updated_at и этапу
                «completed».
              </dd>
            </div>
          </dl>
        </>
      }
      variant="lg"
    >
      <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 p-6 shadow-xl shadow-black/20">
        <h2 className="font-header text-[10px] uppercase tracking-[0.22em] text-soviet-cream/40">
          Параметры
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["month", "Этот месяц"],
              ["prev_month", "Прошлый месяц"],
              ["7d", "7 дней"],
              ["30d", "30 дней"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => applyPreset(k)}
              className="rounded-full border border-white/12 bg-zinc-950/60 px-3 py-1.5 font-header text-[10px] uppercase tracking-wider text-soviet-cream/65 transition-colors hover:border-tech-cyan/30 hover:text-soviet-cream/90"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[140px] flex-1 space-y-1.5 sm:max-w-[200px]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-soviet-cream/45">
              С даты
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-white/12 bg-zinc-950 px-3 py-2.5 text-sm text-soviet-cream outline-none transition-colors focus:border-tech-cyan/40 focus:ring-1 focus:ring-tech-cyan/20"
            />
          </label>
          <label className="block min-w-[140px] flex-1 space-y-1.5 sm:max-w-[200px]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-soviet-cream/45">
              По дату
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-white/12 bg-zinc-950 px-3 py-2.5 text-sm text-soviet-cream outline-none transition-colors focus:border-tech-cyan/40 focus:ring-1 focus:ring-tech-cyan/20"
            />
          </label>
        </div>

        {bothSegments ? (
          <fieldset className="mt-6 space-y-3 border-0 p-0">
            <legend className="text-[10px] font-medium uppercase tracking-wider text-soviet-cream/45">
              Включить в отчёт
            </legend>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-soviet-cream/80">
                <input
                  type="checkbox"
                  checked={includeRetail}
                  onChange={(e) => setIncludeRetail(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-zinc-950 accent-soviet-red"
                />
                Физлица и подписки
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-soviet-cream/80">
                <input
                  type="checkbox"
                  checked={includeB2b}
                  onChange={(e) => setIncludeB2b(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-zinc-950 accent-violet-500"
                />
                Юридические лица
              </label>
            </div>
          </fieldset>
        ) : null}

        {canRetail && (!bothSegments || includeRetail) ? (
          <label className="mt-6 flex cursor-pointer items-center gap-2.5 text-sm text-soviet-cream/75">
            <input
              type="checkbox"
              checked={retailSuccessOnly}
              onChange={(e) => setRetailSuccessOnly(e.target.checked)}
              className="size-4 rounded border-white/20 bg-zinc-950 accent-soviet-red"
            />
            Розница: только сделки с исходом «Успех»
          </label>
        ) : null}

        {canB2b && (!bothSegments || includeB2b) ? (
          <fieldset className="mt-4 space-y-2 border-0 p-0">
            <legend className="text-[10px] font-medium uppercase tracking-wider text-soviet-cream/45">
              Юрлица: период
            </legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-soviet-cream/75">
              <input
                type="radio"
                name="b2bPeriod"
                checked={b2bPeriodMode === "created"}
                onChange={() => setB2bPeriodMode("created")}
                className="accent-violet-500"
              />
              По дате создания (created_at)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-soviet-cream/75">
              <input
                type="radio"
                name="b2bPeriod"
                checked={b2bPeriodMode === "closed_success"}
                onChange={() => setB2bPeriodMode("closed_success")}
                className="accent-violet-500"
              />
              Закрыты успехом в период (updated_at, этап completed)
            </label>
          </fieldset>
        ) : null}

        <label className="mt-6 flex cursor-pointer items-center gap-2.5 text-sm text-soviet-cream/75">
          <input
            type="checkbox"
            checked={showCurrencyBreakdown}
            onChange={(e) => setShowCurrencyBreakdown(e.target.checked)}
            className="size-4 rounded border-white/20 bg-zinc-950 accent-tech-cyan"
          />
          Показать разбивку по валютам (после формирования)
        </label>

        <div className="mt-8">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runReport()}
            className="w-full rounded-xl bg-gradient-to-r from-soviet-red to-red-700 py-3.5 font-header text-[12px] uppercase tracking-[0.15em] text-white shadow-lg shadow-red-900/25 transition-opacity hover:opacity-95 disabled:opacity-45 sm:w-auto sm:min-w-[240px] sm:px-10"
          >
            {loading ? "Формируем…" : "Сформировать отчёт"}
          </button>
        </div>

        {err ? (
          <p className="mt-4 rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 text-sm text-red-300/90">
            {err}
          </p>
        ) : null}
      </section>

      <section className="mt-12">
        {!snapshot ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950/30 px-6 py-16 text-center">
            <p className="font-header text-[11px] uppercase tracking-[0.2em] text-soviet-cream/35">
              Результат
            </p>
            <p className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-soviet-cream/50">
              Здесь появятся цифры после нажатия «Сформировать отчёт». Менять даты и типы можно
              сколько угодно — пересчёт только по кнопке.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-header text-[10px] uppercase tracking-[0.2em] text-emerald-400/80">
                  Сформировано
                </p>
                <p className="mt-1 text-lg font-medium text-soviet-cream tabular-nums">
                  {formatRuDate(snapshot.from)} — {formatRuDate(snapshot.to)}
                </p>
                {snapshot.retailSuccessOnly ? (
                  <p className="mt-1 text-[11px] text-soviet-cream/45">Розница: только успех.</p>
                ) : null}
                {snapshot.includedB2b ? (
                  <p className="mt-1 text-[11px] text-soviet-cream/45">
                    B2B:{" "}
                    {snapshot.b2bPeriodMode === "closed_success"
                      ? "закрытие успехом в периоде"
                      : "создание в периоде"}
                    .
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <p className="text-[12px] text-soviet-cream/40 tabular-nums">
                  {new Date(snapshot.generatedAt).toLocaleString("ru-RU", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => exportSnapshotCsv()}
                  className="rounded-lg border border-white/20 px-3 py-1.5 font-header text-[10px] uppercase tracking-widest text-tech-cyan/90 hover:bg-white/5"
                >
                  Скачать CSV сводки
                </button>
              </div>
            </div>
            <p className="mb-8 text-[12px] text-soviet-cream/45">
              Курсы отчёта: 1 USD ={" "}
              <span className="tabular-nums text-soviet-cream/70">
                {snapshot.fx.rubPerUsd.toLocaleString("ru-RU")}
              </span>{" "}
              RUB,{" "}
              <span className="tabular-nums text-soviet-cream/70">
                {snapshot.fx.uzsPerUsd.toLocaleString("ru-RU")}
              </span>{" "}
              UZS
            </p>

            <div className="grid gap-6 lg:grid-cols-2">
              {snapshot.includedRetail && retailAgg ? (
                <article className="overflow-hidden rounded-2xl border border-soviet-red/20 bg-zinc-900/40">
                  <div className="border-b border-soviet-red/15 bg-soviet-red/[0.07] px-5 py-3">
                    <h3 className="font-header text-xs font-bold uppercase tracking-wide text-soviet-red">
                      Физлица и подписки
                    </h3>
                  </div>
                  <ul className="divide-y divide-white/[0.06] px-5 py-1">
                    <MetricRow label="Уникальных клиентов" value={retailAgg.uniqueClients} />
                    <MetricRow label="Сделок в периоде" value={retailAgg.dealCount} />
                    <MetricRow
                      label="Оборот, USD"
                      value={`${retailAgg.turnoverUsd.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} $`}
                      accent="emerald"
                    />
                    <MetricRow
                      label="Маржа, USD"
                      value={`${retailAgg.marginUsd.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} $`}
                      accent="violet"
                    />
                  </ul>
                  <p className="border-t border-white/5 px-5 py-3 text-[11px] leading-relaxed text-soviet-cream/38">
                    Маржа — сумма <code className="text-tech-cyan/60">margin_amount</code> с
                    пересчётом в USD; пустые не входят.
                  </p>
                  {retailByCur && Object.keys(retailByCur).length > 0 ? (
                    <div className="border-t border-white/5 px-5 py-3">
                      <p className="font-header text-[10px] uppercase tracking-wider text-soviet-cream/45">
                        По валютам
                      </p>
                      <ul className="mt-2 space-y-1 text-[12px] text-soviet-cream/70">
                        {Object.entries(retailByCur)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([cur, b]) => (
                            <li key={cur} className="flex justify-between gap-4 tabular-nums">
                              <span>{cur}</span>
                              <span>
                                {b.dealCount} сд. · оборот {b.turnoverUsd.toLocaleString("ru-RU")} $ ·
                                маржа {b.marginUsd.toLocaleString("ru-RU")} $
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ) : null}

              {snapshot.includedB2b && b2bAgg ? (
                <article className="overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-950/10">
                  <div className="border-b border-violet-500/15 bg-violet-500/[0.08] px-5 py-3">
                    <h3 className="font-header text-xs font-bold uppercase tracking-wide text-violet-300">
                      Юридические лица
                    </h3>
                  </div>
                  <ul className="divide-y divide-white/[0.06] px-5 py-1">
                    <MetricRow label="Уникальных компаний" value={b2bAgg.uniqueClients} />
                    <MetricRow label="Сделок в периоде" value={b2bAgg.dealCount} />
                    <MetricRow
                      label="Оборот, USD (экв.)"
                      value={`${b2bAgg.turnoverUsd.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} $`}
                      accent="emerald"
                    />
                    <MetricRow
                      label="Ожидаемая маржа, USD"
                      value={`${b2bAgg.marginUsd.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} $`}
                      accent="violet"
                    />
                  </ul>
                  {b2bAgg.turnoverSkippedRows > 0 ? (
                    <p className="border-t border-amber-500/15 bg-amber-950/15 px-5 py-2.5 text-[11px] text-amber-200/85">
                      В оборот не вошли {b2bAgg.turnoverSkippedRows} сделок (EUR / GBP / OTHER — нет
                      курса в CRM).
                    </p>
                  ) : null}
                  <p className="border-t border-white/5 px-5 py-3 text-[11px] text-soviet-cream/38">
                    Маржа — <code className="text-tech-cyan/60">expected_margin_usd</code>.
                  </p>
                  {b2bByCur && Object.keys(b2bByCur).length > 0 ? (
                    <div className="border-t border-white/5 px-5 py-3">
                      <p className="font-header text-[10px] uppercase tracking-wider text-soviet-cream/45">
                        Оборот в USD по валюте сделки
                      </p>
                      <ul className="mt-2 space-y-1 text-[12px] text-soviet-cream/70">
                        {Object.entries(b2bByCur)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([cur, b]) => (
                            <li key={cur} className="flex justify-between gap-4 tabular-nums">
                              <span>{cur}</span>
                              <span>
                                {b.dealCount} сд. · {b.turnoverUsd.toLocaleString("ru-RU")} $
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ) : null}
            </div>

            <div className="mt-8">
              <button
                type="button"
                disabled={loading}
                onClick={() => void runReport()}
                className="text-[11px] uppercase tracking-widest text-tech-cyan/80 hover:text-tech-cyan disabled:opacity-40"
              >
                Обновить с теми же параметрами
              </button>
            </div>
          </div>
        )}
      </section>
    </CrmPageShell>
  );
}

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "emerald" | "violet";
}) {
  const valClass =
    accent === "emerald"
      ? "text-emerald-200/95"
      : accent === "violet"
        ? "text-violet-200/95"
        : "text-soviet-cream";

  return (
    <li className="flex items-baseline justify-between gap-4 py-3.5">
      <span className="text-[13px] text-soviet-cream/55">{label}</span>
      <span className={`text-right text-[15px] font-semibold tabular-nums ${valClass}`}>
        {typeof value === "number" ? value.toLocaleString("ru-RU") : value}
      </span>
    </li>
  );
}

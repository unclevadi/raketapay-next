"use client";

import { useEffect, useMemo, useState } from "react";
import { crmCard, crmErrorBanner, crmInput, crmLabel, crmSelect } from "@/lib/crm/crm-ui";
import { buildPriceBreakdown, formulaHints, type FxRates } from "@/lib/crm/pricing";
import type { CrmClientCurrency } from "@/lib/crm/types";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmPageShell } from "../CrmPageShell";
import { CrmPageHeaderSkeleton } from "../CrmSkeletons";

type ServiceRow = {
  id: string;
  name: string;
  cost_usd: number;
  default_markup_percent: number;
};

const CURRENCIES: { v: CrmClientCurrency; label: string }[] = [
  { v: "RUB", label: "Итог в RUB" },
  { v: "UZS", label: "Итог в UZS" },
  { v: "USD", label: "Итог в USD" },
];

export default function CrmPricePage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [fx, setFx] = useState<FxRates | null>(null);
  const [serviceId, setServiceId] = useState<string>("");
  const [costUsd, setCostUsd] = useState<number>(0);
  const [markupPercent, setMarkupPercent] = useState<number>(15);
  const [quoteCurrency, setQuoteCurrency] = useState<CrmClientCurrency>("RUB");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const supabase = supabaseBrowser();

      const [svcRes, fxRes] = await Promise.all([
        supabase
          .from("crm_services")
          .select("id, name, cost_usd, default_markup_percent")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("crm_exchange_rates")
          .select("uzs_per_usd, rub_per_usd")
          .eq("id", 1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (svcRes.error) {
        setError(svcRes.error.message);
        setLoading(false);
        return;
      }
      if (fxRes.error) {
        setError(fxRes.error.message);
        setLoading(false);
        return;
      }

      const list = (svcRes.data ?? []) as ServiceRow[];
      setServices(list);
      if (fxRes.data) {
        setFx({
          uzsPerUsd: Number(fxRes.data.uzs_per_usd),
          rubPerUsd: Number(fxRes.data.rub_per_usd),
        });
      } else {
        setFx(null);
      }

      if (list.length) {
        const first = list[0];
        setServiceId(first.id);
        setCostUsd(Number(first.cost_usd));
        setMarkupPercent(Number(first.default_markup_percent));
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const s = services.find((x) => x.id === serviceId);
    if (s) {
      setCostUsd(Number(s.cost_usd));
      setMarkupPercent(Number(s.default_markup_percent));
    }
  }, [serviceId, services]);

  const breakdown = useMemo(() => {
    if (!fx) return null;
    return buildPriceBreakdown(costUsd, markupPercent, fx, quoteCurrency);
  }, [costUsd, markupPercent, fx, quoteCurrency]);

  const hints = fx ? formulaHints(fx, markupPercent) : [];

  return (
    <CrmPageShell
      title="Прайс-калькулятор"
      description="Выберите услугу из справочника или отредактируйте USD и наценку вручную для разового расчёта."
      variant="md"
    >
      {loading ? (
        <CrmPageHeaderSkeleton />
      ) : error ? (
        <div className={crmErrorBanner}>{error}</div>
      ) : (
        <div className="space-y-6">
          <div className={`${crmCard} space-y-4`}>
            <label className="block space-y-1.5">
              <span className={crmLabel}>Услуга</span>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                disabled={services.length === 0}
                className={`${crmSelect} disabled:opacity-50`}
              >
                {services.length === 0 ? (
                  <option value="">Нет услуг в справочнике</option>
                ) : (
                  services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className={crmLabel}>Себестоимость / база, USD</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={Number.isFinite(costUsd) ? costUsd : 0}
                onChange={(e) => setCostUsd(Number(e.target.value))}
                className={crmInput}
              />
            </label>

            <label className="block space-y-1.5">
              <span className={crmLabel}>Наценка, %</span>
              <input
                type="number"
                step="0.1"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(Number(e.target.value))}
                className={crmInput}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              {CURRENCIES.map(({ v, label }) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-2 text-sm text-soviet-cream/80"
                >
                  <input
                    type="radio"
                    name="quote"
                    checked={quoteCurrency === v}
                    onChange={() => setQuoteCurrency(v)}
                    className="accent-soviet-red"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {!fx ? (
            <p className="text-sm text-amber-400/90">
              Курсы не загружены. Задайте их в разделе «Курсы».
            </p>
          ) : breakdown ? (
            <div className="rounded-2xl border border-tech-cyan/20 bg-tech-cyan/5 p-5 space-y-4">
              <h2 className="font-header text-xs uppercase tracking-[0.2em] text-tech-cyan/80">
                Расчёт
              </h2>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-white/10">
                  <tr>
                    <td className="py-2 text-soviet-cream/55">База USD</td>
                    <td className="py-2 text-right font-medium">{breakdown.costUsd}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-soviet-cream/55">База UZS</td>
                    <td className="py-2 text-right font-medium">
                      {breakdown.baseUzs.toLocaleString("ru-RU")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-soviet-cream/55">База RUB</td>
                    <td className="py-2 text-right font-medium">
                      {breakdown.baseRub.toLocaleString("ru-RU")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-soviet-cream/55">Клиент USD</td>
                    <td className="py-2 text-right font-medium">{breakdown.clientUsd}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-soviet-cream/55">Клиент UZS</td>
                    <td className="py-2 text-right font-medium">
                      {breakdown.clientUzs.toLocaleString("ru-RU")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-soviet-cream/55">Клиент RUB</td>
                    <td className="py-2 text-right font-medium">
                      {breakdown.clientRub.toLocaleString("ru-RU")}
                    </td>
                  </tr>
                  <tr className="border-t border-soviet-red/30">
                    <td className="py-3 font-header text-xs uppercase text-soviet-red">
                      Итог для клиента ({breakdown.quoteCurrency})
                    </td>
                    <td className="py-3 text-right font-header text-lg text-soviet-cream">
                      {breakdown.clientInQuoteCurrency.toLocaleString("ru-RU")}
                    </td>
                  </tr>
                </tbody>
              </table>
              <ul className="space-y-1 border-t border-white/10 pt-3 text-[11px] text-soviet-cream/45">
                {hints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </CrmPageShell>
  );
}

import type { CrmClientCurrency } from "./types";

/**
 * Операционные курсы: сколько UZS/RUB за 1 USD (как в crm_exchange_rates).
 * Формулы для UI:
 * - base_uzs = cost_usd * uzs_per_usd
 * - base_rub = cost_usd * rub_per_usd
 * - client_* = base_* * (1 + markup_percent/100) при наценке в процентах от базы в той же валюте
 */
export type FxRates = {
  uzsPerUsd: number;
  rubPerUsd: number;
};

export type PriceBreakdown = {
  costUsd: number;
  markupPercent: number;
  baseUzs: number;
  baseRub: number;
  clientUsd: number;
  clientUzs: number;
  clientRub: number;
  /** В какой валюте показываем итог клиенту */
  quoteCurrency: CrmClientCurrency;
  /** Итог в quoteCurrency (для быстрого вывода) */
  clientInQuoteCurrency: number;
};

function roundMoney(n: number, decimals = 2): number {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

/** Себестоимость USD в валюте клиента (по операционному курсу из crm_exchange_rates). */
export function costInClientCurrency(
  costUsd: number,
  currency: CrmClientCurrency,
  fx: FxRates
): number {
  if (currency === "USD") return roundMoney(costUsd, 4);
  if (currency === "RUB") return roundMoney(costUsd * fx.rubPerUsd, 2);
  return roundMoney(costUsd * fx.uzsPerUsd, 2);
}

/** Маржа = оплата клиента минус себестоимость в той же валюте (без отдельного умножения на %). */
export function marginFromClientAndCost(
  clientAmount: number,
  costUsd: number,
  currency: CrmClientCurrency,
  fx: FxRates
): number {
  const costLocal = costInClientCurrency(costUsd, currency, fx);
  return roundMoney(clientAmount - costLocal, 2);
}

/** Ориентир суммы клиента: себестоимость в валюте × (1 + наценка%). */
export function suggestedClientAmount(
  costUsd: number,
  markupPercent: number,
  currency: CrmClientCurrency,
  fx: FxRates
): number {
  const base = costInClientCurrency(costUsd, currency, fx);
  return applyMarkup(base, markupPercent);
}

/** База в нац. валютах без наценки */
export function basesFromUsd(costUsd: number, fx: FxRates) {
  return {
    baseUzs: roundMoney(costUsd * fx.uzsPerUsd, 2),
    baseRub: roundMoney(costUsd * fx.rubPerUsd, 2),
  };
}

/** Наценка % от суммы в той же валюте (USD / UZS / RUB дают согласованный итог). */
export function applyMarkup(amount: number, markupPercent: number): number {
  return roundMoney(amount * (1 + markupPercent / 100), 2);
}

export function buildPriceBreakdown(
  costUsd: number,
  markupPercent: number,
  fx: FxRates,
  quoteCurrency: CrmClientCurrency = "RUB"
): PriceBreakdown {
  const { baseUzs, baseRub } = basesFromUsd(costUsd, fx);
  const clientUsd = applyMarkup(costUsd, markupPercent);
  const clientUzs = applyMarkup(baseUzs, markupPercent);
  const clientRub = applyMarkup(baseRub, markupPercent);

  const clientInQuoteCurrency =
    quoteCurrency === "USD"
      ? clientUsd
      : quoteCurrency === "UZS"
        ? clientUzs
        : clientRub;

  return {
    costUsd: roundMoney(costUsd, 4),
    markupPercent,
    baseUzs,
    baseRub,
    clientUsd,
    clientUzs,
    clientRub,
    quoteCurrency,
    clientInQuoteCurrency,
  };
}

/** Строки подсказок для оператора (прозрачность формул). */
export function formulaHints(fx: FxRates, markupPercent: number): string[] {
  return [
    `UZS = USD × ${fx.uzsPerUsd}`,
    `RUB = USD × ${fx.rubPerUsd}`,
    `Клиент = база × (1 + ${markupPercent}%)`,
  ];
}

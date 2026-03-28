/** Пересчёт суммы сделки в USD по тем же курсам, что crm_exchange_rates (только RUB/UZS к USD). */

export type B2bFxSnapshot = {
  rubPerUsd: number;
  uzsPerUsd: number;
};

export type ToUsdResult =
  | { ok: true; usd: number }
  | { ok: false; reason: "no_fx" | "unsupported_currency" | "non_positive_amount" };

export function transferAmountToUsd(
  amount: number,
  currency: string,
  fx: B2bFxSnapshot | null
): ToUsdResult {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "non_positive_amount" };
  if (!fx || fx.rubPerUsd <= 0 || fx.uzsPerUsd <= 0) return { ok: false, reason: "no_fx" };

  const c = currency.toUpperCase();
  if (c === "USD") return { ok: true, usd: round(amount, 2) };
  if (c === "RUB") return { ok: true, usd: round(amount / fx.rubPerUsd, 2) };
  if (c === "UZS") return { ok: true, usd: round(amount / fx.uzsPerUsd, 2) };
  return { ok: false, reason: "unsupported_currency" };
}

export function marginPercentOfTransfer(marginUsd: number, transferUsd: number): number | null {
  if (!Number.isFinite(marginUsd) || !Number.isFinite(transferUsd) || transferUsd <= 0) return null;
  return round((marginUsd / transferUsd) * 100, 3);
}

export function marginUsdFromPercent(transferUsd: number, percent: number): number | null {
  if (!Number.isFinite(transferUsd) || transferUsd <= 0) return null;
  if (!Number.isFinite(percent)) return null;
  return round((transferUsd * percent) / 100, 2);
}

function round(n: number, decimals: number) {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

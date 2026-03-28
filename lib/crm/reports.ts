import { transferAmountToUsd, type B2bFxSnapshot } from "./b2b-fx";
import type { CrmClientCurrency } from "./types";

export type ReportFx = {
  rubPerUsd: number;
  uzsPerUsd: number;
};

function roundMoney(n: number, decimals = 2) {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

/** Сумма клиента в сделке → USD (как операционные курсы CRM). */
export function retailAmountToUsd(
  amount: number,
  currency: CrmClientCurrency,
  fx: ReportFx
): number {
  if (!Number.isFinite(amount)) return 0;
  if (currency === "USD") return roundMoney(amount, 4);
  if (currency === "RUB") return roundMoney(amount / fx.rubPerUsd, 2);
  return roundMoney(amount / fx.uzsPerUsd, 2);
}

export type RetailDealRow = {
  client_name: string;
  client_amount: number;
  client_currency: string;
  margin_amount: number | null;
};

export function aggregateRetailDeals(rows: RetailDealRow[], fx: ReportFx) {
  let turnoverUsd = 0;
  let marginUsd = 0;
  const clients = new Set<string>();

  for (const r of rows) {
    const key = r.client_name.trim().toLowerCase();
    if (key) clients.add(key);
    const cur = r.client_currency as CrmClientCurrency;
    turnoverUsd += retailAmountToUsd(Number(r.client_amount), cur, fx);
    if (r.margin_amount != null && Number.isFinite(Number(r.margin_amount))) {
      marginUsd += retailAmountToUsd(Number(r.margin_amount), cur, fx);
    }
  }

  return {
    dealCount: rows.length,
    uniqueClients: clients.size,
    turnoverUsd: roundMoney(turnoverUsd, 2),
    marginUsd: roundMoney(marginUsd, 2),
  };
}

export type B2bDealRow = {
  company_legal_name: string;
  transfer_amount: number;
  transfer_currency: string;
  expected_margin_usd: number | null;
};

export function aggregateB2bDeals(rows: B2bDealRow[], fx: B2bFxSnapshot | null) {
  let turnoverUsd = 0;
  let marginUsd = 0;
  let turnoverSkipped = 0;
  const clients = new Set<string>();

  for (const r of rows) {
    const key = r.company_legal_name.trim().toLowerCase();
    if (key) clients.add(key);
    const res = transferAmountToUsd(Number(r.transfer_amount), r.transfer_currency, fx);
    if (res.ok) turnoverUsd += res.usd;
    else turnoverSkipped += 1;
    if (r.expected_margin_usd != null && Number.isFinite(Number(r.expected_margin_usd))) {
      marginUsd += Number(r.expected_margin_usd);
    }
  }

  return {
    dealCount: rows.length,
    uniqueClients: clients.size,
    turnoverUsd: roundMoney(turnoverUsd, 2),
    marginUsd: roundMoney(marginUsd, 2),
    turnoverSkippedRows: turnoverSkipped,
  };
}

export type CurrencyBucketRetail = {
  dealCount: number;
  turnoverUsd: number;
  marginUsd: number;
};

/** Roznica: oborot i marzha v USD po valjute oplaty klienta. */
export function retailBreakdownByCurrency(rows: RetailDealRow[], fx: ReportFx) {
  const m = new Map<string, CurrencyBucketRetail>();
  for (const r of rows) {
    const c = String(r.client_currency || "—");
    const cur = c as CrmClientCurrency;
    let b = m.get(c);
    if (!b) {
      b = { dealCount: 0, turnoverUsd: 0, marginUsd: 0 };
      m.set(c, b);
    }
    b.dealCount += 1;
    b.turnoverUsd += retailAmountToUsd(Number(r.client_amount), cur, fx);
    if (r.margin_amount != null && Number.isFinite(Number(r.margin_amount))) {
      b.marginUsd += retailAmountToUsd(Number(r.margin_amount), cur, fx);
    }
  }
  const out: Record<string, CurrencyBucketRetail> = {};
  for (const [k, v] of m) {
    out[k] = {
      dealCount: v.dealCount,
      turnoverUsd: roundMoney(v.turnoverUsd, 2),
      marginUsd: roundMoney(v.marginUsd, 2),
    };
  }
  return out;
}

export type CurrencyBucketB2b = {
  dealCount: number;
  turnoverUsd: number;
};

/** B2B: oborot v USD po valjute sdelki; marzha v otchetah — tolko v svodke (USD). */
export function b2bBreakdownByCurrency(rows: B2bDealRow[], fx: B2bFxSnapshot | null) {
  const m = new Map<string, CurrencyBucketB2b>();
  for (const r of rows) {
    const c = String(r.transfer_currency || "—");
    let b = m.get(c);
    if (!b) {
      b = { dealCount: 0, turnoverUsd: 0 };
      m.set(c, b);
    }
    b.dealCount += 1;
    const res = transferAmountToUsd(Number(r.transfer_amount), r.transfer_currency, fx);
    if (res.ok) b.turnoverUsd += res.usd;
  }
  const out: Record<string, CurrencyBucketB2b> = {};
  for (const [k, v] of m) {
    out[k] = {
      dealCount: v.dealCount,
      turnoverUsd: roundMoney(v.turnoverUsd, 2),
    };
  }
  return out;
}

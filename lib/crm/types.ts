/** Соответствуют enum в Supabase (миграция crm_mvp). */

export type CrmDealLineType =
  | "subscription"
  | "one_off"
  | "topup"
  | "transfer"
  | "other";

export type CrmClientCurrency = "USD" | "UZS" | "RUB";

export type CrmPaymentMethod =
  | "card"
  | "bank_transfer"
  | "crypto"
  | "cash"
  | "other";

/** Розничная сделка: исход (миграция crm_retail_deal_outcome). */
export type CrmRetailDealOutcome = "open" | "success" | "lost";

export type CrmExchangeRatesRow = {
  id: number;
  uzs_per_usd: number;
  rub_per_usd: number;
  updated_at: string;
  updated_by: string | null;
};

export type CrmServiceRow = {
  id: string;
  category_id: string;
  name: string;
  catalog_key: string;
  line_type: CrmDealLineType;
  cost_usd: number;
  default_markup_percent: number;
  price_source_note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

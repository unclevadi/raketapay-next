export type B2bGateDeal = {
  company_legal_name: string;
  country_code: string;
  transfer_amount: number | string;
  tax_id?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  purpose_summary?: string | null;
  expected_margin_usd?: number | string | null;
};

/** Soobshhenie ob oshibke ili null esli mozhno perehodit na targetSlug. */
export function b2bStageGateMessage(deal: B2bGateDeal, targetSlug: string): string | null {
  if (targetSlug !== "contract" && targetSlug !== "execution") return null;

  const company = deal.company_legal_name?.trim();
  const cc = deal.country_code?.trim().toUpperCase();
  if (!company || cc.length !== 2) {
    return "Укажите название компании и код страны (ISO2) перед этим этапом.";
  }

  const amt = Number(String(deal.transfer_amount).replace(",", "."));
  if (!Number.isFinite(amt) || amt <= 0) {
    return "Укажите положительную сумму перевода.";
  }

  const tax = deal.tax_id?.trim();
  if (!tax) {
    return "Для этапов «Договор» и «Исполнение» нужен ИНН / tax id.";
  }

  if (!deal.contact_name?.trim() || !deal.contact_email?.trim()) {
    return "Заполните контакт (ФИО и email).";
  }

  if (targetSlug === "execution") {
    if (!deal.purpose_summary?.trim()) {
      return "Для «Исполнения» укажите назначение платежа (кратко).";
    }
    const m = deal.expected_margin_usd;
    const mn =
      m === null || m === undefined || m === ""
        ? NaN
        : Number(typeof m === "string" ? m.replace(",", ".") : m);
    if (!Number.isFinite(mn)) {
      return "Для «Исполнения» укажите ожидаемую маржу в USD (число).";
    }
  }

  return null;
}

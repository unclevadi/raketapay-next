export type TemplateDealFields = Record<string, string | number | null | undefined>;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** {{key}} v tekste. */
export function renderB2bTemplate(template: string, deal: TemplateDealFields): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = deal[key];
    if (v === null || v === undefined) return "";
    return String(v);
  });
}

export function renderB2bTemplateHtml(template: string, deal: TemplateDealFields): string {
  const plain = renderB2bTemplate(template, deal);
  return esc(plain).replace(/\n/g, "<br/>");
}

export function buildTemplateDealFields(
  deal: Record<string, unknown>,
  extras: { stage_label?: string | null }
): TemplateDealFields {
  const contactName = (deal.contact_name as string | null | undefined)?.trim() ?? "";
  const contactGreeting = contactName ? `, ${contactName}` : "";

  const purpose = (deal.purpose_summary as string | null | undefined)?.trim() ?? "";
  const purposeBlock = purpose ? `Назначение: ${purpose}\n` : "";

  const notes = (deal.internal_notes as string | null | undefined)?.trim() ?? "";
  const internalNotesBlock = notes ? `Внутр.: ${notes}\n` : "";

  const tcd = deal.target_close_date as string | null | undefined;
  const targetCloseLabel = tcd ? String(tcd).slice(0, 10) : "—";

  return {
    company_legal_name: String(deal.company_legal_name ?? ""),
    country_code: String(deal.country_code ?? ""),
    transfer_amount: deal.transfer_amount as number | string,
    tax_id: (deal.tax_id as string | null) ?? null,
    contact_name: (deal.contact_name as string | null) ?? null,
    contact_email: (deal.contact_email as string | null) ?? null,
    purpose_summary: (deal.purpose_summary as string | null) ?? null,
    expected_margin_usd: deal.expected_margin_usd as number | string | null | undefined,
    contact_greeting: contactGreeting,
    purpose_block: purposeBlock,
    internal_notes_block: internalNotesBlock,
    target_close_date: targetCloseLabel,
    stage_label: extras.stage_label ?? "—",
    transfer_amount_fmt: Number(deal.transfer_amount ?? 0).toLocaleString("ru-RU"),
  };
}

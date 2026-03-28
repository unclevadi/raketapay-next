/** Bucket i ogranichenija — v parе s migraciej crm_b2b_deal_documents. */

export const CRM_B2B_DOCUMENTS_BUCKET = "crm-b2b-documents";

/** Sovpadaet s file_size_limit v bucket (50 MiB). */
export const CRM_B2B_DOC_MAX_BYTES = 50 * 1024 * 1024;

export const CRM_B2B_DOCUMENT_KINDS = [
  "contract",
  "invoice",
  "closing",
  "correspondence",
  "other",
] as const;

export type CrmB2bDocumentKind = (typeof CRM_B2B_DOCUMENT_KINDS)[number];

export const CRM_B2B_DOCUMENT_KIND_LABELS: Record<CrmB2bDocumentKind, string> = {
  contract: "Договор",
  invoice: "Счёт / инвойс",
  closing: "Закрывающие",
  correspondence: "Переписка",
  other: "Прочее",
};

export function sanitizeB2bStorageFileName(name: string): string {
  const base = name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return base || "file";
}

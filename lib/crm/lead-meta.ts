export const CRM_LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  qualified: "Квалифицирована",
  converted: "В сделку",
  lost: "Потеряна",
  spam: "Спам",
};

export type CrmLeadStatus = keyof typeof CRM_LEAD_STATUS_LABELS;

export const CRM_LEAD_INTENDED_LABELS: Record<string, string> = {
  retail: "Физлицо",
  b2b: "Юрлицо",
};

export type CrmLeadIntendedSegment = keyof typeof CRM_LEAD_INTENDED_LABELS;

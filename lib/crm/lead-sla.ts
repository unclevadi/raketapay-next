/** Chasy v status «new» bez reakcii — dlya podsvetki i dashborda. */
export const CRM_LEAD_NEW_SLA_HOURS = 24;

export function leadNewAgeHours(createdAtIso: string): number {
  const t = new Date(createdAtIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return (Date.now() - t) / (1000 * 60 * 60);
}

export function isLeadNewOverSla(createdAtIso: string, hours = CRM_LEAD_NEW_SLA_HOURS): boolean {
  return leadNewAgeHours(createdAtIso) >= hours;
}

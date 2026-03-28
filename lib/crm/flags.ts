/**
 * CRM доступна по URL только при NEXT_PUBLIC_ENABLE_CRM=true (см. middleware).
 */
export function isCrmEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_CRM === "true";
}

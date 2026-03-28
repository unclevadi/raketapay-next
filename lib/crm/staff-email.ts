/**
 * Логин без @ трактуем как локальная часть email (для теста: s21 → s21@…).
 * Полный email должен совпадать с пользователем в Supabase Auth.
 */
export const CRM_STAFF_EMAIL_DOMAIN = "crm.raketapay.internal";

export function staffEmailFromLogin(login: string): string {
  const t = login.trim();
  if (!t) {
    throw new Error("Введите логин или email");
  }
  if (t.includes("@")) {
    return t.toLowerCase();
  }
  return `${t.toLowerCase()}@${CRM_STAFF_EMAIL_DOMAIN}`;
}

/**
 * Один раз: создаёт пользователя s21 / пароль и строку crm_staff (service role).
 * Требует в .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Домен email должен совпадать с lib/crm/staff-email.ts → CRM_STAFF_EMAIL_DOMAIN
 *
 * Запуск: npm run crm:bootstrap-user
 *
 * После продакшена удалите скрипт или не храните тестовый пароль в репо.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(name) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return;
  const s = fs.readFileSync(p, "utf8");
  for (const line of s.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const CRM_STAFF_EMAIL_DOMAIN = "crm.raketapay.internal";
const TEST_EMAIL = `s21@${CRM_STAFF_EMAIL_DOMAIN}`;
const TEST_PASSWORD = "s21pay";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  email_confirm: true,
  user_metadata: { role_hint: "crm_test" },
});

if (createErr) {
  const already =
    createErr.message?.toLowerCase().includes("already") ||
    createErr.status === 422;
  if (already) {
    const { data: listData, error: listErr } =
      await admin.auth.admin.listUsers({ perPage: 200 });
    if (listErr) {
      console.error(listErr);
      process.exit(1);
    }
    const existing = listData?.users?.find((u) => u.email === TEST_EMAIL);
    if (!existing) {
      console.error(createErr);
      process.exit(1);
    }
    console.log("Пользователь уже есть:", TEST_EMAIL, existing.id);
    const { error: upErr } = await admin.from("crm_staff").upsert(
      {
        user_id: existing.id,
        email: TEST_EMAIL,
        is_admin: true,
        can_access_retail: true,
        can_access_b2b: true,
        can_confirm_success: true,
      },
      { onConflict: "user_id" }
    );
    if (upErr) {
      console.error("crm_staff:", upErr.message);
      process.exit(1);
    }
    console.log("crm_staff обновлён.");
    process.exit(0);
  }
  console.error(createErr);
  process.exit(1);
}

const userId = created.user.id;
const { error: staffErr } = await admin.from("crm_staff").upsert(
  {
    user_id: userId,
    email: TEST_EMAIL,
    is_admin: true,
    can_access_retail: true,
    can_access_b2b: true,
    can_confirm_success: true,
  },
  { onConflict: "user_id" }
);

if (staffErr) {
  console.error("crm_staff:", staffErr.message);
  process.exit(1);
}

console.log("Готово. Вход в CRM:");
console.log("  логин: s21   (или полный email:", TEST_EMAIL + ")");
console.log("  пароль:", TEST_PASSWORD);

/**
 * Генерирует SQL-сид crm_services из ключей и title в lib/service-details.ts
 * и карты категорий (как на главной: AI / subs / travel / market / transfers / business).
 *
 * Запуск из корня raketapay-next:
 *   node scripts/generate-crm-catalog-seed.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { COST_BY_CATALOG_KEY } from "./catalog-cost-usd.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const detailsPath = path.join(root, "lib", "service-details.ts");
const text = fs.readFileSync(detailsPath, "utf8");

const marker = "const SERVICE_DETAILS: Record<string, ServiceDetail> = {";
const start = text.indexOf(marker);
if (start < 0) throw new Error("SERVICE_DETAILS not found");
const brace0 = text.indexOf("{", start);
let depth = 0;
let end = brace0;
for (let i = brace0; i < text.length; i++) {
  if (text[i] === "{") depth++;
  if (text[i] === "}") {
    depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
}
const body = text.slice(brace0 + 1, end);

const entryRe =
  /\n  (?:(\w+)|"([^"]+)"):\s*\{[\s\S]*?\n    title:\s*"((?:\\.|[^"\\])*)"/g;
const services = [];
let m;
while ((m = entryRe.exec(body)) !== null) {
  const key = m[1] ?? m[2];
  const title = m[3].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  services.push({ key, title });
}

/** @type {Record<string, 'ai'|'subs'|'travel'|'market'|'transfers'|'business'>} */
const CATEGORY = {
  // AI & Генерация
  Suno: "ai",
  Midjourney: "ai",
  Gamma: "ai",
  DeepSeek: "ai",
  Cursor: "ai",
  Krea: "ai",
  "OpenAI API": "ai",
  Kling: "ai",
  Runway: "ai",
  ElevenLabs: "ai",
  Freepik: "ai",
  Lensa: "ai",
  Perplexity: "ai",
  Grok: "ai",
  Candy: "ai",
  Leonardo: "ai",
  Pika: "ai",
  NanoBanana: "ai",
  Claude: "ai",
  Gemini: "ai",
  GenSpark: "ai",
  Manus: "ai",
  Higgsfield: "ai",
  // Подписки & Софт
  ChatGPT: "subs",
  Netflix: "subs",
  Spotify: "subs",
  YouTube: "subs",
  Apple: "subs",
  "Disney+": "subs",
  Notion: "subs",
  Figma: "subs",
  Adobe: "subs",
  Zoom: "subs",
  Slack: "subs",
  Discord: "subs",
  "Google One": "subs",
  Dropbox: "subs",
  "Canva Pro": "subs",
  Miro: "subs",
  Trello: "subs",
  NordVPN: "subs",
  ExpressVPN: "subs",
  "Amazon Prime": "subs",
  SoundCloud: "subs",
  Patreon: "subs",
  Tinder: "subs",
  OnlyFans: "subs",
  Badoo: "subs",
  GitHub: "subs",
  Deezer: "subs",
  Tidal: "subs",
  // Путешествия
  "Booking.com": "travel",
  Airbnb: "travel",
  Expedia: "travel",
  "Hotels.com": "travel",
  Emirates: "travel",
  "Turkish Airlines": "travel",
  Lufthansa: "travel",
  "Air France": "travel",
  "British Airways": "travel",
  Ryanair: "travel",
  Klook: "travel",
  "Trip.com": "travel",
  // Маркетплейсы & Игры
  Steam: "market",
  "Epic Games": "market",
  PlayStation: "market",
  GOG: "market",
  Ubisoft: "market",
  EA: "market",
  Roblox: "market",
  Amazon: "market",
  eBay: "market",
  AliExpress: "market",
  Etsy: "market",
  G2A: "market",
  "Humble Bundle": "market",
  // Переводы
  Alipay: "transfers",
  "Денежные переводы": "transfers",
  // Для бизнеса (сетка + B2B)
  Wise: "business",
  Payoneer: "business",
  Upwork: "business",
  Shopify: "business",
  Fiverr: "business",
  GitLab: "business",
  Vercel: "business",
  Cloudflare: "business",
  DigitalOcean: "business",
  Docker: "business",
  Kubernetes: "business",
  Jira: "business",
  Asana: "business",
  Linear: "business",
  Stripe: "business",
};

function catalogKey(name) {
  if (name === "Денежные переводы") return "money_transfers";
  return name
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9а-яё]+/gi, "_")
    .replace(/^_|_$/g, "")
    .replace(/_+/g, "_");
}

function lineType(slug, key) {
  if (key === "Alipay") return "topup";
  if (slug === "transfers") return "transfer";
  if (["Steam", "PlayStation", "Roblox", "Epic Games"].includes(key))
    return "topup";
  if (slug === "travel" || slug === "market") return "one_off";
  if (slug === "subs" || slug === "ai") return "subscription";
  return "other";
}

function escSql(s) {
  return s.replace(/'/g, "''");
}

const missing = services.filter((s) => !CATEGORY[s.key]);
if (missing.length) {
  console.error("Нет категории для ключей:", missing.map((x) => x.key).join(", "));
  process.exit(1);
}

const outPath = path.join(
  root,
  "supabase/migrations/20260328120001_crm_catalog_seed.sql"
);

const lines = [
  "/*",
  "  Avtogeneratsiya: npm run crm:seed-sql",
  "  Pozitsii praysa iz lib/service-details.ts",
  "  cost_usd: orientiry publichnyh USD (scripts/catalog-cost-usd.mjs) — ne vasha zakupka.",
  "*/",
  "",
  "INSERT INTO public.crm_services (category_id, name, catalog_key, line_type, cost_usd, default_markup_percent, sort_order)",
  "SELECT c.id, v.name, v.catalog_key, v.line_type::public.crm_deal_line_type, v.cost_usd::numeric, v.markup::numeric, v.ord",
  "FROM public.crm_service_categories c",
  "JOIN (VALUES",
];

services.forEach((s, idx) => {
  const slug = CATEGORY[s.key];
  const ck = catalogKey(s.key);
  const lt = lineType(slug, s.key);
  const name = escSql(s.title);
  const cost = COST_BY_CATALOG_KEY[ck] ?? 0;
  const comma = idx < services.length - 1 ? "," : "";
  lines.push(
    `  (${idx + 1}, '${slug}'::text, '${name}'::text, '${ck}'::text, '${lt}'::text, ${cost}::numeric, 15::numeric)${comma}`
  );
});

lines.push(
  `) AS v(ord, cat_slug, name, catalog_key, line_type, cost_usd, markup) ON c.slug = v.cat_slug`,
  "ON CONFLICT (catalog_key) DO UPDATE SET",
  "  name = EXCLUDED.name,",
  "  category_id = EXCLUDED.category_id,",
  "  line_type = EXCLUDED.line_type,",
  "  cost_usd = EXCLUDED.cost_usd,",
  "  updated_at = now();",
  ""
);

fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.error("Wrote", outPath);

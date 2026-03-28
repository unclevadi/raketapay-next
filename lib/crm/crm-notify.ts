import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function staffEmail(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  try {
    const admin = supabaseAdmin();
    const { data } = await admin.from("crm_staff").select("email").eq("user_id", userId).maybeSingle();
    const e = data?.email?.trim();
    return e && e.includes("@") ? e : null;
  } catch {
    return null;
  }
}

export async function sendTelegramIfConfigured(text: string): Promise<void> {
  const token = process.env.CRM_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.CRM_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!r.ok) {
    console.error("CRM Telegram notify failed", await r.text());
  }
}

export async function sendEmailIfConfigured(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CRM_NOTIFY_EMAIL_FROM?.trim();
  if (!key || !to.includes("@")) return;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: from ?? "Raketa CRM <onboarding@resend.dev>",
      to: [to],
      subject: subject.slice(0, 200),
      html,
    }),
  });
  if (!r.ok) {
    console.error("CRM Resend notify failed", await r.text());
  }
}

export async function notifyNewLeadCrm(lead: {
  id: string;
  contact_name: string;
  company_name?: string | null;
  assigned_to?: string | null;
}): Promise<void> {
  const mgr = await staffEmail(lead.assigned_to);
  const lines = [
    "<b>Новая заявка в CRM</b>",
    `Контакт: ${escapeHtml(lead.contact_name)}`,
    lead.company_name ? `Компания: ${escapeHtml(lead.company_name)}` : "",
    `ID: <code>${lead.id}</code>`,
    mgr ? `Менеджер: ${escapeHtml(mgr)}` : "<i>Без назначенного</i>",
  ].filter(Boolean);
  await sendTelegramIfConfigured(lines.join("\n"));
  if (mgr) {
    await sendEmailIfConfigured(
      mgr,
      `Новая заявка: ${lead.contact_name}`,
      `<p>Заявка <code>${lead.id}</code></p><p>${escapeHtml(lead.contact_name)}</p>`
    );
  }
}

export async function notifyB2bStageChangeCrm(params: {
  dealId: string;
  company: string;
  fromSlug?: string | null;
  toSlug?: string | null;
  assignedTo?: string | null;
}): Promise<void> {
  const mgr = await staffEmail(params.assignedTo);
  const lines = [
    "<b>B2B: смена этапа</b>",
    escapeHtml(params.company),
    `Этап: ${escapeHtml(params.fromSlug ?? "?")} → ${escapeHtml(params.toSlug ?? "?")}`,
    `ID: <code>${params.dealId}</code>`,
    mgr ? `Менеджер: ${escapeHtml(mgr)}` : "<i>Без назначенного</i>",
  ];
  await sendTelegramIfConfigured(lines.join("\n"));
  if (mgr) {
    await sendEmailIfConfigured(
      mgr,
      `B2B этап: ${params.company}`,
      `<p>${escapeHtml(params.fromSlug ?? "?")} → ${escapeHtml(params.toSlug ?? "?")}</p><p>${escapeHtml(
        params.company
      )}</p>`
    );
  }
}

export async function notifyNewB2bDealCrm(params: {
  dealId: string;
  company: string;
  assignedTo?: string | null;
}): Promise<void> {
  const mgr = await staffEmail(params.assignedTo);
  const lines = [
    "<b>Новая B2B-сделка</b>",
    escapeHtml(params.company),
    `ID: <code>${params.dealId}</code>`,
    mgr ? `Менеджер: ${escapeHtml(mgr)}` : "<i>Без назначенного</i>",
  ];
  await sendTelegramIfConfigured(lines.join("\n"));
  if (mgr) {
    await sendEmailIfConfigured(
      mgr,
      `Новая B2B: ${params.company}`,
      `<p>${escapeHtml(params.company)}</p>`
    );
  }
}

import Link from "next/link";
import {
  CRM_B2B_DOCUMENTS_BUCKET,
  CRM_B2B_DOCUMENT_KIND_LABELS,
} from "@/lib/crm/b2b-documents";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function PublicB2bDealPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token?.trim()) {
    return <Invalid message="Некорректная ссылка." />;
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return <Invalid message="Сервис временно недоступен." />;
  }

  const { data: linkRow, error: linkErr } = await admin
    .from("crm_b2b_deal_share_tokens")
    .select("id, deal_id, expires_at, revoked_at")
    .eq("token", token.trim())
    .maybeSingle();

  if (linkErr || !linkRow || linkRow.revoked_at) {
    return <Invalid message="Ссылка недействительна или отозвана." />;
  }

  if (linkRow.expires_at && new Date(linkRow.expires_at) < new Date()) {
    return <Invalid message="Срок действия ссылки истёк." />;
  }

  const { data: deal, error: dealErr } = await admin
    .from("crm_b2b_deals")
    .select(
      "company_legal_name, transfer_amount, transfer_currency, purpose_summary, contact_name, target_close_date, stage_id"
    )
    .eq("id", linkRow.deal_id)
    .maybeSingle();

  if (dealErr || !deal) {
    return <Invalid message="Сделка не найдена." />;
  }

  const { data: stage } = await admin
    .from("crm_b2b_pipeline_stages")
    .select("label, slug")
    .eq("id", deal.stage_id)
    .maybeSingle();

  const { data: docs } = await admin
    .from("crm_b2b_deal_documents")
    .select("id, storage_path, original_filename, document_kind, version_index")
    .eq("deal_id", linkRow.deal_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const docLinks: { href: string; label: string }[] = [];
  for (const d of docs ?? []) {
    const path = d.storage_path as string;
    const { data: signed } = await admin.storage
      .from(CRM_B2B_DOCUMENTS_BUCKET)
      .createSignedUrl(path, 900);
    if (signed?.signedUrl) {
      const kind = CRM_B2B_DOCUMENT_KIND_LABELS[d.document_kind as keyof typeof CRM_B2B_DOCUMENT_KIND_LABELS] ?? d.document_kind;
      docLinks.push({
        href: signed.signedUrl,
        label: `${kind} · v${d.version_index ?? 1} · ${d.original_filename}`,
      });
    }
  }

  const tcd = deal.target_close_date ? String(deal.target_close_date).slice(0, 10) : "—";

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <p className="font-header text-[10px] uppercase tracking-[0.25em] text-violet-400/80">Raketa Pay</p>
      <h1 className="mt-2 font-header text-xl font-bold text-violet-100">Статус сделки</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Краткая информация по запросу. По вопросам свяжитесь с вашим менеджером.
      </p>

      <dl className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Компания</dt>
          <dd className="mt-1 text-base text-zinc-100">{deal.company_legal_name}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Этап</dt>
          <dd className="mt-1 text-zinc-200">{stage?.label ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Сумма перевода</dt>
          <dd className="mt-1 font-mono tabular-nums text-zinc-200">
            {Number(deal.transfer_amount).toLocaleString("ru-RU")} {deal.transfer_currency}
          </dd>
        </div>
        {deal.purpose_summary ? (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Назначение</dt>
            <dd className="mt-1 text-sm text-zinc-300">{deal.purpose_summary}</dd>
          </div>
        ) : null}
        {deal.contact_name ? (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Контакт</dt>
            <dd className="mt-1 text-zinc-200">{deal.contact_name}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Целевая дата закрытия</dt>
          <dd className="mt-1 text-zinc-200">{tcd}</dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="font-header text-[10px] uppercase tracking-[0.2em] text-zinc-500">Документы</h2>
        {docLinks.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Пока нет прикреплённых файлов.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {docLinks.map((d) => (
              <li key={d.href}>
                <a
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
                >
                  {d.label}
                </a>
                <span className="ml-2 text-[10px] text-zinc-600">(ссылка ~15 мин)</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-center text-[11px] text-zinc-600">
        <Link href="/" className="text-zinc-500 hover:text-zinc-400">
          На сайт Raketa Pay
        </Link>
      </p>
    </main>
  );
}

function Invalid({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-zinc-400">{message}</p>
      <Link href="/" className="mt-6 inline-block text-sm text-sky-500 hover:text-sky-400">
        На главную
      </Link>
    </main>
  );
}

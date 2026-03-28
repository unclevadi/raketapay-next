"use client";

import { useCallback, useEffect, useState } from "react";
import { crmBtnDanger, crmBtnSecondary, crmInput, crmLabel } from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ShareRow = {
  id: string;
  token: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type Props = { dealId: string };

function publicBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
}

export function B2bDealSharePanel({ dealId }: Props) {
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  const load = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from("crm_b2b_deal_share_tokens")
      .select("id, token, expires_at, revoked_at, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as ShareRow[]);
    }
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createLink() {
    if (!dealId) return;
    setBusy(true);
    setErr(null);
    setCopyOk(false);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const exp =
      expires.trim().length >= 10
        ? new Date(expires.trim()).toISOString()
        : null;
    const { error } = await supabase.from("crm_b2b_deal_share_tokens").insert({
      deal_id: dealId,
      expires_at: exp,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setExpires("");
      await load();
    }
  }

  async function revoke(id: string) {
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("crm_b2b_deal_share_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setErr(error.message);
    else await load();
  }

  function copyUrl(token: string) {
    const url = `${publicBaseUrl()}/p/b2b/${token}`;
    void navigator.clipboard.writeText(url);
    setCopyOk(true);
    setErr(null);
  }

  const active = rows.filter((r) => !r.revoked_at);

  return (
    <section className="rounded-2xl border border-sky-500/20 bg-sky-950/10 p-4">
      <h2 className="font-header text-[10px] uppercase tracking-[0.2em] text-sky-300/80">
        Ссылка для клиента (только просмотр)
      </h2>
      <p className="mt-1 text-[12px] text-soviet-cream/45">
        Показываем безопасный набор полей и список документов. Внутренние заметки и ИНН не показываем.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block w-full min-w-[200px] sm:max-w-xs space-y-1">
          <span className={crmLabel}>Истекает (опционально)</span>
          <input type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className={crmInput} />
        </label>
        <button type="button" disabled={busy} onClick={() => void createLink()} className={crmBtnSecondary}>
          Создать ссылку
        </button>
      </div>

      {err ? <p className="mt-2 text-sm text-red-300/90">{err}</p> : null}
      {copyOk ? <p className="mt-2 text-sm text-emerald-300/85">Ссылка скопирована.</p> : null}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-soviet-cream/45">Загрузка…</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-soviet-cream/45">Нет активных ссылок.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 break-all font-mono text-[11px] text-soviet-cream/65">
                  {publicBaseUrl()}/p/b2b/{r.token.slice(0, 12)}…
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => copyUrl(r.token)} className={crmBtnSecondary}>
                    Копировать
                  </button>
                  <button type="button" onClick={() => void revoke(r.id)} className={crmBtnDanger}>
                    Отозвать
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

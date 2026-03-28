"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { escapeIlikePattern } from "@/lib/crm/ilike-escape";
import { CRM_LEAD_STATUS_LABELS } from "@/lib/crm/lead-meta";
import { crmBtnDanger, crmErrorBanner, crmInput, crmLabel } from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmEmptyState } from "../CrmEmptyState";
import { CrmPageShell } from "../CrmPageShell";

type Hit =
  | { kind: "lead"; id: string; title: string; subtitle: string; href: string }
  | { kind: "retail"; id: string; title: string; subtitle: string; href: string }
  | { kind: "b2b"; id: string; title: string; subtitle: string; href: string };

function mergeById<T extends { id: string }>(rows: T[]) {
  const m = new Map<string, T>();
  for (const r of rows) m.set(r.id, r);
  return [...m.values()];
}

export default function CrmSearchPage() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  const run = useCallback(async () => {
    const raw = q.trim();
    if (raw.length < 2) {
      setErr("Введите не менее 2 символов.");
      return;
    }
    setBusy(true);
    setErr(null);
    const supabase = supabaseBrowser();
    const pat = `%${escapeIlikePattern(raw)}%`;

    const out: Hit[] = [];

    try {
      const leadFields = ["contact_name", "company_name", "contact_email", "contact_phone"] as const;
      const leadSets = await Promise.all(
        leadFields.map((f) =>
          supabase
            .from("crm_leads")
            .select("id, contact_name, company_name, status, contact_email")
            .ilike(f, pat)
            .limit(25)
        )
      );
      for (const { error } of leadSets) {
        if (error) throw new Error(`Заявки: ${error.message}`);
      }
      const leadRows = mergeById(
        leadSets.flatMap(
          (s) =>
            (s.data ?? []) as {
              id: string;
              contact_name: string;
              company_name: string | null;
              status: string;
              contact_email: string | null;
            }[]
        )
      );
      for (const r of leadRows) {
        const st = r.status as keyof typeof CRM_LEAD_STATUS_LABELS;
        const label = CRM_LEAD_STATUS_LABELS[st] ?? r.status;
        out.push({
          kind: "lead",
          id: r.id,
          title: r.contact_name,
          subtitle: [r.company_name, r.contact_email, label].filter(Boolean).join(" · "),
          href: `/crm/leads/${r.id}`,
        });
      }

      const retailFields = ["client_name", "contact_email", "contact_phone"] as const;
      const retailSets = await Promise.all(
        retailFields.map((f) =>
          supabase
            .from("crm_deals")
            .select("id, client_name, contact_email, contact_phone, paid_at")
            .ilike(f, pat)
            .order("paid_at", { ascending: false })
            .limit(25)
        )
      );
      for (const { error } of retailSets) {
        if (error) throw new Error(`Розница: ${error.message}`);
      }
      const retailRows = mergeById(
        retailSets.flatMap(
          (s) =>
            (s.data ?? []) as {
              id: string;
              client_name: string;
              contact_email: string | null;
              contact_phone: string | null;
            }[]
        )
      );
      for (const r of retailRows) {
        out.push({
          kind: "retail",
          id: r.id,
          title: r.client_name,
          subtitle: [r.contact_email, r.contact_phone].filter(Boolean).join(" · ") || "Сделка",
          href: "/crm/deals",
        });
      }

      const b2bFields = ["company_legal_name", "contact_name", "contact_email"] as const;
      const b2bSets = await Promise.all(
        b2bFields.map((f) =>
          supabase
            .from("crm_b2b_deals")
            .select("id, company_legal_name, contact_name, contact_email, created_at")
            .ilike(f, pat)
            .order("created_at", { ascending: false })
            .limit(25)
        )
      );
      for (const { error } of b2bSets) {
        if (error) throw new Error(`B2B: ${error.message}`);
      }
      const b2bRows = mergeById(
        b2bSets.flatMap(
          (s) =>
            (s.data ?? []) as {
              id: string;
              company_legal_name: string;
              contact_name: string | null;
              contact_email: string | null;
            }[]
        )
      );
      for (const r of b2bRows) {
        out.push({
          kind: "b2b",
          id: r.id,
          title: r.company_legal_name,
          subtitle: [r.contact_name, r.contact_email].filter(Boolean).join(" · ") || "B2B",
          href: `/crm/b2b/${r.id}`,
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
      setHits([]);
      setBusy(false);
      return;
    }

    setHits(out);
    setBusy(false);
  }, [q]);

  return (
    <CrmPageShell
      title="Поиск"
      description="Заявки, розница и B2B по имени, компании, email или телефону. Символы % и _ в запросе экранируются и не работают как маски."
      variant="narrow"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-1">
          <span className={crmLabel}>Строка поиска</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void run())}
            placeholder="Например, имя или домен email"
            className={crmInput}
          />
        </label>
        <button
          type="button"
          disabled={busy || !canSearch}
          onClick={() => void run()}
          className={`${crmBtnDanger} shrink-0 rounded-xl px-6`}
        >
          {busy ? "…" : "Найти"}
        </button>
      </div>

      {err ? <div className={`mt-4 ${crmErrorBanner}`}>{err}</div> : null}

      {hits.length > 0 ? (
        <ul className="mt-8 divide-y divide-white/10 rounded-xl border border-white/10 bg-zinc-900/35 shadow-sm">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.id}`}>
              <Link
                href={h.href}
                className="block px-4 py-3.5 transition-colors duration-200 hover:bg-white/[0.05]"
              >
                <span className="font-header text-[9px] uppercase tracking-wider text-soviet-cream/38">
                  {h.kind === "lead" ? "Заявка" : h.kind === "retail" ? "Розница" : "B2B"}
                </span>
                <p className="mt-0.5 font-medium text-soviet-cream/92">{h.title}</p>
                <p className="mt-0.5 text-[12px] text-soviet-cream/52">{h.subtitle}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : !busy && q.trim().length >= 2 && !err ? (
        <div className="mt-8">
          <CrmEmptyState title="Ничего не найдено" hint="Попробуйте другую строку или проверьте права доступа к разделам." />
        </div>
      ) : null}
    </CrmPageShell>
  );
}

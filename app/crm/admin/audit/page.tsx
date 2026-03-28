"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  crmBtnSecondary,
  crmErrorBanner,
  crmTable,
  crmTableWrap,
  crmTd,
  crmTh,
  crmThead,
  crmTrEven,
} from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmEmptyState } from "../../CrmEmptyState";
import { CrmPageShell } from "../../CrmPageShell";
import { CrmTableSkeleton } from "../../CrmSkeletons";

type Row = {
  id: string;
  user_id: string | null;
  event_type: string;
  entity_table: string;
  entity_id: string;
  summary: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export default function CrmAdminAuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from("crm_audit_log")
      .select("id, user_id, event_type, entity_table, entity_id, summary, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      setMsg(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <CrmPageShell
      title="Журнал событий"
      description={
        <>
          Последние записи из <code className="text-tech-cyan/72">crm_audit_log</code> — пишут все
          сотрудники, читают все.
        </>
      }
      variant="lg"
      prepend={
        <Link
          href="/crm/admin/staff"
          className="text-[11px] uppercase tracking-widest text-tech-cyan/88 transition-colors duration-200 hover:text-tech-cyan"
        >
          ← Сотрудники
        </Link>
      }
      actions={
        <button type="button" disabled={loading} onClick={() => void load()} className={crmBtnSecondary}>
          Обновить
        </button>
      }
    >
      {msg ? <div className={`mb-6 ${crmErrorBanner}`}>{msg}</div> : null}

      {loading ? (
        <CrmTableSkeleton rows={10} cols={4} />
      ) : rows.length === 0 ? (
        <CrmEmptyState title="Пока пусто" hint="События появятся после действий в CRM." />
      ) : (
        <div className={crmTableWrap}>
          <table className={`${crmTable} min-w-[720px] text-[12px]`}>
            <thead className={crmThead}>
              <tr>
                <th className={crmTh}>Когда</th>
                <th className={crmTh}>Событие</th>
                <th className={crmTh}>Сущность</th>
                <th className={crmTh}>Кратко</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={crmTrEven}>
                  <td className={`${crmTd} whitespace-nowrap text-soviet-cream/58`}>
                    {new Date(r.created_at).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className={`${crmTd} font-mono text-[11px] text-violet-300/92`}>
                    {r.event_type}
                  </td>
                  <td className={`${crmTd} text-soviet-cream/68`}>
                    <span className="font-mono text-[10px]">{r.entity_table}</span>
                    <span className="block truncate font-mono text-[10px] text-soviet-cream/40">
                      {r.entity_id}
                    </span>
                  </td>
                  <td className={`${crmTd} max-w-md text-soviet-cream/82`}>
                    {r.summary ?? "—"}
                    {r.meta && Object.keys(r.meta).length > 0 ? (
                      <pre className="mt-1 max-h-20 overflow-auto rounded bg-zinc-950/80 p-2 font-mono text-[10px] text-soviet-cream/45">
                        {JSON.stringify(r.meta, null, 0)}
                      </pre>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CrmPageShell>
  );
}

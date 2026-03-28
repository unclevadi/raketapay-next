"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchCrmStaffOptions,
  staffEmailById,
  type CrmStaffOption,
} from "@/lib/crm/staff-directory";
import {
  crmErrorBanner,
  crmSectionTitle,
  crmStatCard,
  crmTable,
  crmTableWrap,
  crmTd,
  crmTh,
  crmThead,
  crmTrEven,
} from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CrmDashboardSkeleton } from "../CrmSkeletons";
import { CrmPageShell } from "../CrmPageShell";
import { useCrmAccess } from "../CrmAccessProvider";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Dash = {
  leadsNew: number | null;
  retailOpen: number | null;
  b2bUnassigned: number | null;
  b2bOverdue: number | null;
  slaLeadsOverdue: number | null;
  b2bMarginUsd: number | null;
};

type FunnelEdge = { from: string; to: string; n: number };

const UNASSIGNED = "__unassigned__";

type ManagerRow = {
  userId: string;
  label: string;
  leadsNew: number;
  retailOpen: number;
  b2bActive: number;
};

function bump(
  map: Map<string, { leadsNew: number; retailOpen: number; b2bActive: number }>,
  uid: string | null,
  key: "leadsNew" | "retailOpen" | "b2bActive"
) {
  const k = uid?.trim() ? uid.trim() : UNASSIGNED;
  const cur = map.get(k) ?? { leadsNew: 0, retailOpen: 0, b2bActive: 0 };
  cur[key] += 1;
  map.set(k, cur);
}

export default function CrmDashboardPage() {
  const { staff, loading: accessLoading } = useCrmAccess();
  const retail = Boolean(staff?.can_access_retail);
  const b2bOk = Boolean(staff?.can_access_b2b || staff?.is_admin);
  const [dash, setDash] = useState<Dash>({
    leadsNew: null,
    retailOpen: null,
    b2bUnassigned: null,
    b2bOverdue: null,
    slaLeadsOverdue: null,
    b2bMarginUsd: null,
  });
  const [byManager, setByManager] = useState<ManagerRow[]>([]);
  const [funnelEdges, setFunnelEdges] = useState<FunnelEdge[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const supabase = supabaseBrowser();
    const today = todayYmd();

    const next: Dash = {
      leadsNew: null,
      retailOpen: null,
      b2bUnassigned: null,
      b2bOverdue: null,
      slaLeadsOverdue: null,
      b2bMarginUsd: null,
    };

    const mgrMap = new Map<
      string,
      { leadsNew: number; retailOpen: number; b2bActive: number }
    >();

    try {
      type StageRow = { id: string; slug: string };
      type AssignRow = { assigned_to: string | null };

      const pStages = b2bOk
        ? supabase.from("crm_b2b_pipeline_stages").select("id, slug")
        : Promise.resolve({ data: [] as StageRow[], error: null });

      const pRetailCount = retail
        ? supabase
            .from("crm_deals")
            .select("*", { count: "exact", head: true })
            .eq("deal_outcome", "open")
        : Promise.resolve({ count: null as number | null, error: null });

      const pRetailRows = retail
        ? supabase.from("crm_deals").select("assigned_to").eq("deal_outcome", "open")
        : Promise.resolve({ data: [] as AssignRow[], error: null });

      const [
        rLeadsCount,
        rLeadsAssign,
        staffRes,
        rStages,
        rRetailCount,
        rRetailRows,
      ] = await Promise.all([
        supabase.from("crm_leads").select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("crm_leads").select("assigned_to").eq("status", "new"),
        fetchCrmStaffOptions(supabase),
        pStages,
        pRetailCount,
        pRetailRows,
      ]);

      if (rLeadsCount.error) throw new Error(rLeadsCount.error.message);
      next.leadsNew = rLeadsCount.count ?? 0;

      if (rLeadsAssign.error) throw new Error(rLeadsAssign.error.message);
      for (const r of rLeadsAssign.data ?? [])
        bump(mgrMap, r.assigned_to as string | null, "leadsNew");

      const slaCut = new Date(Date.now() - 24 * 3600000).toISOString();
      const rSla = await supabase
        .from("crm_leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "new")
        .lt("created_at", slaCut);
      if (rSla.error) throw new Error(rSla.error.message);
      next.slaLeadsOverdue = rSla.count ?? 0;

      if (b2bOk) {
        if (rStages.error) throw new Error(rStages.error.message);
      }
      const terminalIds: string[] = b2bOk
        ? (rStages.data ?? [])
            .filter((s: StageRow) => s.slug === "completed" || s.slug === "rejected")
            .map((s: StageRow) => s.id)
        : [];

      if (retail) {
        if (rRetailCount.error) throw new Error(rRetailCount.error.message);
        next.retailOpen = rRetailCount.count ?? 0;
        if (rRetailRows.error) throw new Error(rRetailRows.error.message);
        for (const r of rRetailRows.data ?? [])
          bump(mgrMap, r.assigned_to as string | null, "retailOpen");
      }

      if (b2bOk) {
        let qUn = supabase
          .from("crm_b2b_deals")
          .select("*", { count: "exact", head: true })
          .is("assigned_to", null);
        if (terminalIds.length) {
          const inList = `(${terminalIds.map((id: string) => `"${id}"`).join(",")})`;
          qUn = qUn.not("stage_id", "in", inList);
        }
        let qOd = supabase
          .from("crm_b2b_deals")
          .select("*", { count: "exact", head: true })
          .not("target_close_date", "is", null)
          .lt("target_close_date", today);
        if (terminalIds.length) {
          const inList = `(${terminalIds.map((id: string) => `"${id}"`).join(",")})`;
          qOd = qOd.not("stage_id", "in", inList);
        }
        let qB2b = supabase.from("crm_b2b_deals").select("assigned_to, stage_id");
        if (terminalIds.length) {
          const inList = `(${terminalIds.map((id: string) => `"${id}"`).join(",")})`;
          qB2b = qB2b.not("stage_id", "in", inList);
        }

        const [{ count: un, error: eUn }, { count: od, error: eOd }, { data: b2bRows, error: eB2bRows }] =
          await Promise.all([qUn, qOd, qB2b]);

        if (eUn) throw new Error(eUn.message);
        next.b2bUnassigned = un ?? 0;
        if (eOd) throw new Error(eOd.message);
        next.b2bOverdue = od ?? 0;
        if (eB2bRows) throw new Error(eB2bRows.message);
        for (const r of b2bRows ?? []) bump(mgrMap, r.assigned_to as string | null, "b2bActive");

        let qMar = supabase.from("crm_b2b_deals").select("expected_margin_usd, stage_id");
        if (terminalIds.length) {
          const inList = `(${terminalIds.map((id: string) => `"${id}"`).join(",")})`;
          qMar = qMar.not("stage_id", "in", inList);
        }
        const { data: marDeals, error: eMar } = await qMar;
        if (eMar) throw new Error(eMar.message);
        next.b2bMarginUsd = (marDeals ?? []).reduce(
          (s, r: { expected_margin_usd: number | null }) => s + (Number(r.expected_margin_usd) || 0),
          0
        );

        const { data: audits, error: eAud } = await supabase
          .from("crm_audit_log")
          .select("meta")
          .eq("event_type", "b2b_stage_changed")
          .order("created_at", { ascending: false })
          .limit(2000);
        if (eAud) throw new Error(eAud.message);
        const edgeMap = new Map<string, number>();
        for (const row of audits ?? []) {
          const meta = row.meta as { from_slug?: string; to_slug?: string } | null;
          const fr = meta?.from_slug ?? "";
          const to = meta?.to_slug ?? "";
          if (!fr && !to) continue;
          const k = `${fr}→${to}`;
          edgeMap.set(k, (edgeMap.get(k) ?? 0) + 1);
        }
        const edges: FunnelEdge[] = [...edgeMap.entries()]
          .map(([k, n]) => {
            const parts = k.split("→");
            return { from: parts[0] || "?", to: parts[1] || "?", n };
          })
          .sort((a, b) => b.n - a.n)
          .slice(0, 24);
        setFunnelEdges(edges);
      } else {
        setFunnelEdges([]);
      }
      const emailMap = staffEmailById(staffRes.options);
      const staffIds = new Set(staffRes.options.map((o: CrmStaffOption) => o.user_id));

      const rowKeys = new Set<string>([...mgrMap.keys()]);
      for (const id of staffIds) rowKeys.add(id);

      const rows: ManagerRow[] = [...rowKeys].map((userId) => {
        const agg = mgrMap.get(userId) ?? { leadsNew: 0, retailOpen: 0, b2bActive: 0 };
        const label =
          userId === UNASSIGNED
            ? "Без назначения"
            : emailMap.get(userId) ?? userId.slice(0, 8) + "…";
        return { userId, label, ...agg };
      });

      rows.sort((a, b) => {
        if (a.userId === UNASSIGNED) return -1;
        if (b.userId === UNASSIGNED) return 1;
        return a.label.localeCompare(b.label, "ru");
      });

      setByManager(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      setByManager([]);
      setFunnelEdges([]);
    }

    setDash(next);
    setLoading(false);
  }, [retail, b2bOk]);

  useEffect(() => {
    if (accessLoading) return;
    void load();
  }, [accessLoading, load]);

  return (
    <CrmPageShell
      title="Дашборд"
      description="Сводка по воронке и разбивка по ответственным (в пределах ваших прав в CRM). Данные обновляются при открытии страницы."
      variant="lg"
    >
      {err ? <div className={`mb-6 ${crmErrorBanner}`}>{err}</div> : null}

      {accessLoading || loading ? (
        <CrmDashboardSkeleton />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            <li>
              <Link
                href="/crm/leads"
                className={`${crmStatCard} border-sky-500/28 bg-sky-950/18 hover:border-sky-400/45`}
              >
                <p className="font-header text-[10px] uppercase tracking-[0.2em] text-sky-400/85">
                  Заявки · новые
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-sky-100">
                  {dash.leadsNew ?? "—"}
                </p>
                <p className="mt-2 text-[12px] text-soviet-cream/50">Статус «Новая» в очереди.</p>
              </Link>
            </li>

            {retail ? (
              <li>
                <Link
                  href="/crm/deals?outcome=open"
                  className={`${crmStatCard} border-amber-500/28 bg-amber-950/12 hover:border-amber-400/42`}
                >
                  <p className="font-header text-[10px] uppercase tracking-[0.2em] text-amber-300/88">
                    Розница · в работе
                  </p>
                  <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-amber-100">
                    {dash.retailOpen ?? "—"}
                  </p>
                  <p className="mt-2 text-[12px] text-soviet-cream/50">
                    Сделки с исходом «В работе» (open).
                  </p>
                </Link>
              </li>
            ) : null}

            {b2bOk ? (
              <>
                <li>
                  <Link
                    href="/crm/b2b"
                    className={`${crmStatCard} border-violet-500/28 bg-violet-950/14 hover:border-violet-400/45`}
                  >
                    <p className="font-header text-[10px] uppercase tracking-[0.2em] text-violet-300/92">
                      B2B · без ответственного
                    </p>
                    <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-violet-100">
                      {dash.b2bUnassigned ?? "—"}
                    </p>
                    <p className="mt-2 text-[12px] text-soviet-cream/50">
                      Не закрытые сделки без назначенного (assigned_to).
                    </p>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/crm/b2b"
                    className={`${crmStatCard} border-red-500/25 bg-red-950/12 hover:border-red-400/40`}
                  >
                    <p className="font-header text-[10px] uppercase tracking-[0.2em] text-red-300/88">
                      B2B · просрочена целевая дата
                    </p>
                    <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-red-100/95">
                      {dash.b2bOverdue ?? "—"}
                    </p>
                    <p className="mt-2 text-[12px] text-soviet-cream/50">
                      target_close_date раньше сегодня, не успех/отказ.
                    </p>
                  </Link>
                </li>
              </>
            ) : null}

            <li>
              <Link
                href="/crm/leads?sla=1"
                className={`${crmStatCard} border-amber-500/28 bg-amber-950/14 hover:border-amber-400/42`}
              >
                <p className="font-header text-[10px] uppercase tracking-[0.2em] text-amber-300/88">
                  Заявки · новые дольше 24 ч
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-amber-100">
                  {dash.slaLeadsOverdue ?? "—"}
                </p>
                <p className="mt-2 text-[12px] text-soviet-cream/50">
                  Статус «Новая», созданы более суток назад (эскалация).
                </p>
              </Link>
            </li>

            {b2bOk ? (
              <li>
                <Link
                  href="/crm/b2b"
                  className={`${crmStatCard} border-emerald-500/25 bg-emerald-950/12 hover:border-emerald-400/40`}
                >
                  <p className="font-header text-[10px] uppercase tracking-[0.2em] text-emerald-300/88">
                    B2B · сумма маржи USD (активные)
                  </p>
                  <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-emerald-100">
                    {dash.b2bMarginUsd != null
                      ? dash.b2bMarginUsd.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
                      : "—"}
                  </p>
                  <p className="mt-2 text-[12px] text-soviet-cream/50">
                    Ожидаемая маржа по незакрытым сделкам (не успех / не отказ).
                  </p>
                </Link>
              </li>
            ) : null}
          </ul>

          {!err && b2bOk && funnelEdges.length > 0 ? (
            <section className="mt-12">
              <h2 className={crmSectionTitle}>B2B · переходы между этапами</h2>
              <p className="mt-1 text-[12px] text-soviet-cream/45">
                По событиям <code className="text-tech-cyan/75">b2b_stage_changed</code> в журнале (последние ~2000
                записей). Не полная воронка, а фактические смены этапов.
              </p>
              <div className={`mt-4 ${crmTableWrap}`}>
                <table className={`${crmTable} min-w-[420px]`}>
                  <thead className={crmThead}>
                    <tr>
                      <th className={crmTh}>Из этапа</th>
                      <th className={crmTh}>В этап</th>
                      <th className={`${crmTh} text-right tabular-nums`}>Раз</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnelEdges.map((e) => (
                      <tr key={`${e.from}-${e.to}`} className={crmTrEven}>
                        <td className={`${crmTd} font-mono text-[11px] text-violet-200/85`}>{e.from}</td>
                        <td className={`${crmTd} font-mono text-[11px] text-violet-200/85`}>{e.to}</td>
                        <td className={`${crmTd} text-right font-mono tabular-nums text-soviet-cream/88`}>
                          {e.n}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {!err && byManager.length > 0 ? (
            <section className="mt-12">
              <h2 className={crmSectionTitle}>По менеджерам</h2>
              <p className="mt-1 text-[12px] text-soviet-cream/45">
                Новые заявки (статус «Новая»); розница — сделки «В работе»; B2B — не завершённые и не
                отклонённые.
              </p>
              <div className={`mt-4 ${crmTableWrap}`}>
                <table className={`${crmTable} min-w-[520px]`}>
                  <thead className={crmThead}>
                    <tr>
                      <th className={crmTh}>Менеджер</th>
                      <th className={`${crmTh} text-right font-header text-[9px] tracking-widest text-sky-400/85`}>
                        Заявки
                      </th>
                      {retail ? (
                        <th
                          className={`${crmTh} text-right font-header text-[9px] tracking-widest text-amber-300/88`}
                        >
                          Розница
                        </th>
                      ) : null}
                      {b2bOk ? (
                        <th
                          className={`${crmTh} text-right font-header text-[9px] tracking-widest text-violet-300/92`}
                        >
                          B2B
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {byManager.map((row) => (
                      <tr key={row.userId} className={crmTrEven}>
                        <td className={`${crmTd} text-soviet-cream/88`}>{row.label}</td>
                        <td className={`${crmTd} text-right font-mono tabular-nums text-sky-200/90`}>
                          {row.leadsNew}
                        </td>
                        {retail ? (
                          <td className={`${crmTd} text-right font-mono tabular-nums text-amber-100/90`}>
                            {row.retailOpen}
                          </td>
                        ) : null}
                        {b2bOk ? (
                          <td className={`${crmTd} text-right font-mono tabular-nums text-violet-100/90`}>
                            {row.b2bActive}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <p className="mt-10 text-[12px] text-soviet-cream/42">
            <Link
              href="/crm/search"
              className="text-tech-cyan/88 transition-colors duration-200 hover:text-tech-cyan"
            >
              Глобальный поиск
            </Link>
            {" · "}
            <Link
              href="/crm/reports"
              className="text-tech-cyan/88 transition-colors duration-200 hover:text-tech-cyan"
            >
              Отчёты
            </Link>
          </p>
        </>
      )}
    </CrmPageShell>
  );
}

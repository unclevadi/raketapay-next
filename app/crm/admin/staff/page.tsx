"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  crmErrorBanner,
  crmInput,
  crmLabel,
  crmSectionTitle,
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

type StaffRow = {
  user_id: string;
  email: string | null;
  can_access_retail: boolean;
  can_access_b2b: boolean;
  is_admin: boolean;
  can_confirm_success: boolean;
  created_at: string;
};

export default function CrmAdminStaffPage() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRetail, setNewRetail] = useState(true);
  const [newB2b, setNewB2b] = useState(false);
  const [newAdmin, setNewAdmin] = useState(false);
  const [newConfirmSuccess, setNewConfirmSuccess] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from("crm_staff")
      .select(
        "user_id, email, can_access_retail, can_access_b2b, is_admin, can_confirm_success, created_at"
      )
      .order("created_at", { ascending: true });
    if (error) {
      setMsg(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as StaffRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(userId: string, patch: Partial<StaffRow>) {
    setMsg(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("crm_staff").update(patch).eq("user_id", userId);
    if (error) setMsg(error.message);
    else await load();
  }

  async function addStaff() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setMsg("Введите email пользователя, уже зарегистрированного в Supabase Auth.");
      return;
    }
    setAdding(true);
    setMsg(null);
    try {
      const res = await fetch("/api/crm/admin/resolve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json()) as { user_id?: string; error?: string };
      if (!res.ok) {
        setMsg(body.error ?? "Ошибка поиска пользователя");
        setAdding(false);
        return;
      }
      const userId = body.user_id;
      if (!userId) {
        setMsg("Нет user_id");
        setAdding(false);
        return;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("crm_staff").upsert(
        {
          user_id: userId,
          email,
          can_access_retail: newRetail,
          can_access_b2b: newB2b,
          is_admin: newAdmin,
          can_confirm_success: newConfirmSuccess,
        },
        { onConflict: "user_id" }
      );
      if (error) setMsg(error.message);
      else {
        setNewEmail("");
        await load();
      }
    } catch {
      setMsg("Сеть или сервер недоступны");
    }
    setAdding(false);
  }

  async function removeRow(userId: string) {
    if (!confirm("Убрать сотрудника из CRM?")) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("crm_staff").delete().eq("user_id", userId);
    if (error) setMsg(error.message);
    else await load();
  }

  return (
    <CrmPageShell
      title="Сотрудники CRM"
      description="Розница и B2B раздельно; курсы редактирует только админ. Новый человек должен сначала появиться в Auth, затем добавьте его здесь по email."
      variant="lg"
      prepend={
        <Link
          href="/crm/admin/audit"
          className="text-[11px] uppercase tracking-widest text-tech-cyan/88 transition-colors duration-200 hover:text-tech-cyan"
        >
          Журнал событий →
        </Link>
      }
    >
      {msg ? <div className={`mb-6 ${crmErrorBanner}`}>{msg}</div> : null}

      <section className="rounded-2xl border border-amber-500/28 bg-amber-950/12 p-5 shadow-sm">
        <h2 className="font-header text-xs uppercase tracking-[0.2em] text-amber-300/92">
          Добавить по email
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[200px] flex-1 space-y-1">
            <span className={crmLabel}>Email</span>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={crmInput}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-soviet-cream/75">
            <input
              type="checkbox"
              checked={newRetail}
              onChange={(e) => setNewRetail(e.target.checked)}
            />
            Розница
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-soviet-cream/75">
            <input type="checkbox" checked={newB2b} onChange={(e) => setNewB2b(e.target.checked)} />
            Юрлица
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-soviet-cream/75">
            <input
              type="checkbox"
              checked={newAdmin}
              onChange={(e) => setNewAdmin(e.target.checked)}
            />
            Админ
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-soviet-cream/75">
            <input
              type="checkbox"
              checked={newConfirmSuccess}
              onChange={(e) => setNewConfirmSuccess(e.target.checked)}
            />
            Успех / отказ
          </label>
          <button
            type="button"
            disabled={adding}
            onClick={() => void addStaff()}
            className="rounded-lg bg-amber-600 px-4 py-2 font-header text-[11px] uppercase tracking-widest text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {adding ? "…" : "Добавить"}
          </button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className={crmSectionTitle}>Список</h2>
        {loading ? (
          <div className="mt-4">
            <CrmTableSkeleton rows={6} cols={6} />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-4">
            <CrmEmptyState title="Список пуст" hint="Добавьте сотрудника по email выше." />
          </div>
        ) : (
          <div className={`mt-4 ${crmTableWrap}`}>
            <table className={`${crmTable} min-w-[560px]`}>
              <thead className={crmThead}>
                <tr>
                  <th className={crmTh}>Email</th>
                  <th className={crmTh}>Розница</th>
                  <th className={crmTh}>B2B</th>
                  <th className={crmTh}>Админ</th>
                  <th className={crmTh} title="Закрытие успехом и отказ (розница и B2B)">
                    Успех
                  </th>
                  <th className={crmTh} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id} className={crmTrEven}>
                    <td className={`${crmTd} text-soviet-cream/88`}>
                      {r.email ?? r.user_id.slice(0, 8) + "…"}
                    </td>
                    <td className={crmTd}>
                      <input
                        type="checkbox"
                        checked={r.can_access_retail}
                        onChange={(e) =>
                          void patch(r.user_id, { can_access_retail: e.target.checked })
                        }
                      />
                    </td>
                    <td className={crmTd}>
                      <input
                        type="checkbox"
                        checked={r.can_access_b2b}
                        onChange={(e) =>
                          void patch(r.user_id, { can_access_b2b: e.target.checked })
                        }
                      />
                    </td>
                    <td className={crmTd}>
                      <input
                        type="checkbox"
                        checked={r.is_admin}
                        onChange={(e) => void patch(r.user_id, { is_admin: e.target.checked })}
                      />
                    </td>
                    <td className={crmTd}>
                      <input
                        type="checkbox"
                        checked={r.can_confirm_success}
                        onChange={(e) =>
                          void patch(r.user_id, { can_confirm_success: e.target.checked })
                        }
                      />
                    </td>
                    <td className={`${crmTd} text-right`}>
                      <button
                        type="button"
                        onClick={() => void removeRow(r.user_id)}
                        className="text-[11px] uppercase tracking-wide text-red-400/88 transition-colors duration-200 hover:text-red-300"
                      >
                        Убрать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </CrmPageShell>
  );
}

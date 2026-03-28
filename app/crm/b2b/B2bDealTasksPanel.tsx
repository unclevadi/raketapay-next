"use client";

import { useCallback, useEffect, useState } from "react";
import { crmBtnPrimary, crmBtnSecondary, crmInput, crmLabel } from "@/lib/crm/crm-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";

export type B2bTaskRow = {
  id: string;
  deal_id: string;
  title: string;
  due_at: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
};

type Props = { dealId: string };

export function B2bDealTasksPanel({ dealId }: Props) {
  const [tasks, setTasks] = useState<B2bTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from("crm_b2b_deal_tasks")
      .select("*")
      .eq("deal_id", dealId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      setMsg(error.message);
      setTasks([]);
    } else {
      setTasks((data ?? []) as B2bTaskRow[]);
    }
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addTask() {
    const t = title.trim();
    if (!t || !dealId) return;
    setBusy(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const maxSort = tasks.reduce((m, x) => Math.max(m, x.sort_order), 0);
    const { error } = await supabase.from("crm_b2b_deal_tasks").insert({
      deal_id: dealId,
      title: t,
      due_at: due.trim() ? new Date(due.trim()).toISOString() : null,
      sort_order: maxSort + 1,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setTitle("");
      setDue("");
      await load();
    }
  }

  async function toggleDone(row: B2bTaskRow) {
    const supabase = supabaseBrowser();
    const next = row.completed_at ? null : new Date().toISOString();
    const { error } = await supabase.from("crm_b2b_deal_tasks").update({ completed_at: next }).eq("id", row.id);
    if (error) setMsg(error.message);
    else await load();
  }

  async function removeTask(id: string) {
    if (!confirm("Удалить задачу?")) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("crm_b2b_deal_tasks").delete().eq("id", id);
    if (error) setMsg(error.message);
    else await load();
  }

  const open = tasks.filter((x) => !x.completed_at);
  const done = tasks.filter((x) => x.completed_at);

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
      <h2 className="font-header text-[10px] uppercase tracking-[0.2em] text-soviet-cream/45">
        Задачи и напоминания
      </h2>
      <p className="mt-1 text-[12px] text-soviet-cream/45">
        Срок можно не указывать. Отметка «готово» не удаляет запись — переносит вниз.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[200px] flex-1 space-y-1">
          <span className={crmLabel}>Новая задача</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Что сделать"
            className={crmInput}
          />
        </label>
        <label className="block w-full min-w-[140px] sm:w-44 space-y-1">
          <span className={crmLabel}>Срок (опц.)</span>
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={crmInput} />
        </label>
        <button type="button" disabled={busy || !title.trim()} onClick={() => void addTask()} className={crmBtnPrimary}>
          Добавить
        </button>
      </div>

      {msg ? <p className="mt-2 text-sm text-red-300/90">{msg}</p> : null}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-soviet-cream/45">Загрузка…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-soviet-cream/45">Пока нет задач.</p>
        ) : (
          <>
            {open.length > 0 ? (
              <ul className="space-y-2">
                {open.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-soviet-cream/90">{row.title}</p>
                      {row.due_at ? (
                        <p className="mt-0.5 text-[11px] text-amber-200/75">
                          До {new Date(row.due_at).toLocaleString("ru-RU")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void toggleDone(row)} className={crmBtnSecondary}>
                        Готово
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeTask(row.id)}
                        className="rounded-lg border border-red-500/35 px-2 py-1 font-header text-[9px] uppercase text-red-300/90"
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {done.length > 0 ? (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-soviet-cream/35">Выполнено</p>
                <ul className="space-y-1">
                  {done.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/5 px-2 py-1.5 text-[12px] text-soviet-cream/50"
                    >
                      <span className="line-through">{row.title}</span>
                      <button type="button" onClick={() => void toggleDone(row)} className="text-tech-cyan/80 text-[11px]">
                        Вернуть
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

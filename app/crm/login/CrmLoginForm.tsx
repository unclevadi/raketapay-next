"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { staffEmailFromLogin } from "@/lib/crm/staff-email";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function CrmLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/crm";

  const [login, setLogin] = useState("s21");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const email = staffEmailFromLogin(login);
      const { error: signError } = await supabaseBrowser().auth.signInWithPassword({
        email,
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      router.push(nextPath.startsWith("/crm") ? nextPath : "/crm");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 font-body">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-xl">
        <div>
          <p className="font-header text-[10px] uppercase tracking-[0.25em] text-soviet-cream/45">
            Вход сотрудника
          </p>
          <h1 className="mt-1 font-header text-xl font-black uppercase italic tracking-tight">
            CRM
          </h1>
          <p className="mt-2 text-xs text-soviet-cream/55">
            Логин <code className="text-tech-cyan/80">s21</code> без домена — в Supabase
            заведён как email <code className="text-tech-cyan/80">s21@crm.raketapay.internal</code>.
          </p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider text-soviet-cream/50">
              Логин или email
            </span>
            <input
              name="login"
              type="text"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm text-soviet-cream outline-none focus:border-tech-cyan/50"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider text-soviet-cream/50">
              Пароль
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm text-soviet-cream outline-none focus:border-tech-cyan/50"
            />
          </label>

          {error ? (
            <p className="text-xs text-red-400/90" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-soviet-red py-3 font-header text-xs uppercase tracking-[0.2em] text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "…" : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}

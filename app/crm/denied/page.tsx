"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function CrmDeniedPage() {
  const router = useRouter();

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.push("/crm/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12 font-body text-center">
      <div className="max-w-md space-y-2">
        <h1 className="font-header text-xl font-black uppercase italic">Нет доступа</h1>
        <p className="text-sm text-soviet-cream/65">
          Вы вошли в аккаунт, но он не добавлен в{" "}
          <code className="text-tech-cyan/80">crm_staff</code>. Попросите администратора
          выдать доступ в Supabase.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-white/20 px-4 py-2 font-header text-[11px] uppercase tracking-widest hover:bg-white/5"
        >
          Другой аккаунт
        </button>
        <Link
          href="/"
          className="rounded-lg bg-soviet-red px-4 py-2 font-header text-[11px] uppercase tracking-widest text-white hover:bg-red-700"
        >
          На сайт
        </Link>
      </div>
    </main>
  );
}

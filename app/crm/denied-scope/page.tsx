import Link from "next/link";

export default function CrmDeniedScopePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-12 font-body text-center">
      <h1 className="font-header text-xl font-black uppercase italic">Нет доступа к разделу</h1>
      <p className="max-w-md text-sm text-soviet-cream/65">
        У вашей учётной записи нет прав на этот блок CRM. Обратитесь к администратору — он выдаёт доступ к
        физлицам (подписки) и к юрлицам отдельно.
      </p>
      <Link
        href="/crm"
        className="rounded-lg border border-white/20 px-4 py-2 font-header text-[11px] uppercase tracking-widest hover:bg-white/5"
      >
        На обзор CRM
      </Link>
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useCrmAccess } from "./CrmAccessProvider";

type StaffRow = NonNullable<ReturnType<typeof useCrmAccess>["staff"]>;

type NavDef = {
  href: string;
  label: string;
  exact?: boolean;
  visible: (s: StaffRow) => boolean;
  activeClass: string;
};

const CRM_NAV: NavDef[] = [
  {
    href: "/crm/leads",
    label: "Заявки",
    visible: (s) => Boolean(s.can_access_retail || s.can_access_b2b || s.is_admin),
    activeClass: "text-tech-cyan",
  },
  {
    href: "/crm/deals",
    label: "Физлица",
    visible: (s) => Boolean(s.can_access_retail),
    activeClass: "text-soviet-red",
  },
  {
    href: "/crm/b2b",
    label: "Юрлица",
    visible: (s) => Boolean(s.can_access_b2b || s.is_admin),
    activeClass: "text-violet-400",
  },
  {
    href: "/crm/price",
    label: "Прайс",
    visible: (s) => Boolean(s.can_access_retail),
    activeClass: "text-soviet-red",
  },
  {
    href: "/crm/dashboard",
    label: "Дашборд",
    visible: (s) => Boolean(s.can_access_retail || s.can_access_b2b || s.is_admin),
    activeClass: "text-sky-400",
  },
  {
    href: "/crm/reports",
    label: "Отчёты",
    visible: (s) => Boolean(s.can_access_retail || s.can_access_b2b || s.is_admin),
    activeClass: "text-emerald-400/95",
  },
  {
    href: "/crm/search",
    label: "Поиск",
    visible: (s) => Boolean(s.can_access_retail || s.can_access_b2b || s.is_admin),
    activeClass: "text-tech-cyan",
  },
  {
    href: "/crm/admin/staff",
    label: "Сотрудники",
    visible: (s) => Boolean(s.is_admin),
    activeClass: "text-amber-400/95",
  },
  {
    href: "/crm/admin/b2b-templates",
    label: "Шаблоны B2B",
    visible: (s) => Boolean(s.is_admin),
    activeClass: "text-amber-400/95",
  },
  {
    href: "/crm/rates",
    label: "Курсы",
    visible: (s) => Boolean(s.can_access_retail),
    activeClass: "text-soviet-red",
  },
  {
    href: "/crm/admin/audit",
    label: "Журнал",
    visible: (s) => Boolean(s.is_admin),
    activeClass: "text-amber-400/95",
  },
  {
    href: "/crm",
    label: "Обзор",
    exact: true,
    visible: (s) => Boolean(s.can_access_retail || s.can_access_b2b || s.is_admin),
    activeClass: "text-soviet-red",
  },
];

const NAV_GROUPS: { label: string; hrefs: readonly string[] }[] = [
  { label: "Воронка", hrefs: ["/crm/leads", "/crm/deals", "/crm/b2b", "/crm/price"] },
  { label: "Сводка", hrefs: ["/crm/dashboard", "/crm/reports", "/crm/search"] },
  {
    label: "Организация",
    hrefs: ["/crm/admin/staff", "/crm/admin/b2b-templates", "/crm/rates", "/crm/admin/audit"],
  },
  { label: "Общее", hrefs: ["/crm"] },
];

function itemsForGroup(hrefs: readonly string[], staff: StaffRow): NavDef[] {
  return hrefs
    .map((href) => CRM_NAV.find((n) => n.href === href))
    .filter((n): n is NavDef => Boolean(n && n.visible(staff)));
}

export function CrmHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, loading } = useCrmAccess();

  const groupedNav = useMemo(() => {
    if (!staff) return [];
    return NAV_GROUPS.map((g) => ({ label: g.label, items: itemsForGroup(g.hrefs, staff) })).filter(
      (g) => g.items.length > 0
    );
  }, [staff]);

  const hideNav =
    pathname === "/crm/login" ||
    pathname === "/crm/denied" ||
    pathname?.startsWith("/crm/login/");

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.push("/crm/login");
    router.refresh();
  }

  const baseLink =
    "block rounded-md border-l-2 py-2.5 pl-2 pr-2 font-header text-[10px] uppercase tracking-widest transition-colors duration-200";
  const idleLink = `${baseLink} border-transparent text-soviet-cream/42 hover:border-white/12 hover:bg-white/[0.04] hover:text-soviet-cream/92`;

  if (hideNav) return null;

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-zinc-950 md:sticky md:top-0 md:h-svh md:w-56 md:border-b-0 md:border-r md:border-white/10">
      <div className="flex items-center justify-between gap-2 px-3 py-3 md:flex-col md:items-stretch md:gap-0 md:px-3 md:pt-4">
        <span className="font-header text-[10px] uppercase leading-tight tracking-[0.18em] text-soviet-cream/55 md:px-2 md:pb-3">
          Raketa Pay
          <span className="block text-[9px] tracking-[0.22em] text-soviet-cream/40">· CRM</span>
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="shrink-0 rounded-md border border-white/15 px-2 py-1 font-header text-[9px] uppercase tracking-widest text-soviet-cream/65 transition-colors duration-200 hover:border-white/25 hover:text-soviet-cream md:mx-2 md:mt-2 md:hidden"
        >
          Выйти
        </button>
      </div>

      <nav className="flex max-h-[42vh] flex-col gap-1 overflow-y-auto px-2 pb-2 md:max-h-none md:flex-1 md:overflow-y-auto md:px-2 md:pb-4">
        {loading ? (
          <span className="px-2 py-2 text-[10px] text-soviet-cream/40">…</span>
        ) : staff ? (
          groupedNav.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ href, label, exact, activeClass }) => {
                  const active = exact
                    ? pathname === href
                    : pathname === href || pathname?.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={
                        active
                          ? `${baseLink} border-white/28 bg-white/[0.07] ${activeClass}`
                          : idleLink
                      }
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        ) : null}
      </nav>

      <div className="mt-auto hidden border-t border-white/10 p-3 md:block">
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full rounded-lg border border-white/15 py-2 font-header text-[10px] uppercase tracking-widest text-soviet-cream/65 transition-colors duration-200 hover:border-white/25 hover:text-soviet-cream"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}

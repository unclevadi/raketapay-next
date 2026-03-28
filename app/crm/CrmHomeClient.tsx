"use client";

import Link from "next/link";
import { crmOverviewLinkCard, crmSectionTitle } from "@/lib/crm/crm-ui";
import { CrmPageHeaderSkeleton } from "./CrmSkeletons";
import { useCrmAccess } from "./CrmAccessProvider";

const retailCards = [
  {
    href: "/crm/rates",
    title: "Курсы",
    text: "Просмотр для всех с retail-доступом; менять курс может только админ.",
  },
  {
    href: "/crm/price",
    title: "Прайс",
    text: "Себестоимость в USD, пересчёт в UZS/RUB и наценка.",
  },
  {
    href: "/crm/deals",
    title: "Сделки",
    text: "Журнал по физлицам и подпискам.",
  },
] as const;

export function CrmHomeClient() {
  const { staff, loading } = useCrmAccess();

  if (loading) {
    return (
      <div className="mt-2">
        <CrmPageHeaderSkeleton />
      </div>
    );
  }

  const opsAccess =
    staff?.can_access_retail || staff?.can_access_b2b || staff?.is_admin;

  return (
    <>
      {opsAccess ? (
        <ul className="grid gap-4 sm:grid-cols-3">
          <li>
            <Link
              href="/crm/dashboard"
              className={`${crmOverviewLinkCard} border-sky-500/28 bg-sky-950/18 hover:border-sky-400/42`}
            >
              <h2 className="font-header text-sm font-bold uppercase tracking-wide text-sky-300/95">
                Дашборд
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-soviet-cream/70">
                Новые заявки, розница «в работе», B2B без ответственного и просрочки.
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/crm/leads"
              className={`${crmOverviewLinkCard} hover:border-tech-cyan/38`}
            >
              <h2 className="font-header text-sm font-bold uppercase tracking-wide text-tech-cyan">
                Заявки
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-soviet-cream/70">
                Входящие лиды и конвертация в сделку.
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/crm/search"
              className={`${crmOverviewLinkCard} hover:border-emerald-400/38`}
            >
              <h2 className="font-header text-sm font-bold uppercase tracking-wide text-emerald-300/90">
                Поиск
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-soviet-cream/70">
                По имени, компании, контактам — заявки, розница, B2B.
              </p>
            </Link>
          </li>
        </ul>
      ) : null}

      {staff?.can_access_retail ? (
        <ul className={`grid gap-4 sm:grid-cols-3 ${opsAccess ? "mt-6" : ""}`}>
          {retailCards.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className={`${crmOverviewLinkCard} hover:border-soviet-red/38`}
              >
                <h2 className="font-header text-sm font-bold uppercase tracking-wide text-soviet-red">
                  {c.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-soviet-cream/70">{c.text}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {staff?.can_access_retail || staff?.can_access_b2b || staff?.is_admin ? (
        <Link
          href="/crm/reports"
          className={`${crmOverviewLinkCard} mt-6 border-emerald-500/28 bg-emerald-950/18 hover:border-emerald-400/42 sm:max-w-md`}
        >
          <h2 className="font-header text-sm font-bold uppercase tracking-wide text-emerald-300/95">
            Отчёты
          </h2>
          <p className="mt-2 text-[13px] text-soviet-cream/70">
            Период и типы, затем кнопка «Сформировать отчёт» — клиенты, оборот и маржа в USD.
          </p>
        </Link>
      ) : null}

      {staff?.can_access_b2b || staff?.is_admin ? (
        <div className="mt-10">
          <h2 className={`${crmSectionTitle} text-violet-400/92`}>B2B</h2>
          <Link
            href="/crm/b2b"
            className={`${crmOverviewLinkCard} mt-3 max-w-md border-violet-500/28 bg-violet-950/18 hover:border-violet-400/45`}
          >
            <span className="font-header text-sm font-bold uppercase text-violet-300">
              Юридические лица
            </span>
            <p className="mt-2 text-[13px] text-soviet-cream/70">
              Сделки с компаниями: страна, сумма перевода, стадии согласования, уровень сделки.
            </p>
          </Link>
        </div>
      ) : null}

      {!staff?.can_access_retail && staff?.can_access_b2b ? (
        <p className="mt-6 text-sm text-soviet-cream/55">
          У вас только доступ к разделу юрлиц — откройте «Юрлица» в меню выше.
        </p>
      ) : null}
    </>
  );
}
